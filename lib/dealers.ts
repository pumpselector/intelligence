import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

export type Dealer = {
  id: number;
  created_at: string;
  uretici: string | null;
  bayi_adi: string | null;
  bayi_ulke: string | null;
  bayi_adres: string | null;
  bayi_telefon: string | null;
  bayi_email: string | null;
  bayi_web: string | null;
  pump: string | null;
  uretici_adres: string | null;
  uretici_ulke: string | null;
  removed: string | null;
  removed_date: string | null;
  /**
   * Opaque, one-way identity tokens attached on the server (see lib/mask.ts).
   * Present for restricted users so the client can compute correct unique
   * counts even though uretici / bayi_adi arrive masked. Never the real value.
   */
  uretici_key?: string | null;
  bayi_key?: string | null;
};

const PAGE_SIZE = 1000;

const DEALER_COLUMNS =
  "id,created_at,uretici,bayi_adi,bayi_ulke,bayi_adres,bayi_telefon,bayi_email,bayi_web,pump,uretici_adres,uretici_ulke,removed,removed_date";

// The dealer data is edited directly in Supabase / via scripts — there's no
// in-app mutation to hook `revalidateTag("dealers")` onto — so a fixed window
// is the staleness bound: a row added in Supabase appears within DEALERS_TTL
// seconds. Bump this (or wire up revalidateTag) if that lag becomes a problem.
const DEALERS_TTL = 300;

/**
 * One {@link PAGE_SIZE}-row page of dealers, cached on its own. Each entry stays
 * well under Next's ~2 MB data-cache limit (the full set is ~2.3 MB), and the
 * page index — passed as the argument — is part of the cache key.
 */
const getCachedDealerPage = unstable_cache(
  async (page: number): Promise<Dealer[]> => {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("dealers")
      .select(DEALER_COLUMNS)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch dealers (page ${page}): ${error.message}`);
    }

    return (data as Dealer[]) ?? [];
  },
  ["dealers-page"],
  { revalidate: DEALERS_TTL, tags: ["dealers"] }
);

const getCachedDealerCount = unstable_cache(
  async (): Promise<number> => {
    const { count, error } = await supabase
      .from("dealers")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new Error(`Failed to count dealers: ${error.message}`);
    }

    return count ?? 0;
  },
  ["dealers-count"],
  { revalidate: DEALERS_TTL, tags: ["dealers"] }
);

/**
 * All dealer rows, ordered by id. Served from Next's data cache for up to
 * {@link DEALERS_TTL} seconds; on a miss the pages are fetched in parallel (one
 * round trip's latency instead of six sequential ones).
 *
 * Rows are RAW (unmasked) here — callers apply {@link maskDealer} per request
 * based on the viewer's access level, so restricted users still never receive
 * real values even though the underlying fetch is shared.
 */
export async function getAllDealers(): Promise<Dealer[]> {
  const count = await getCachedDealerCount();
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, page) => getCachedDealerPage(page))
  );

  return pages.flat();
}

export type NetworkCoverageStats = {
  pumpModels: number;
  pumpProducers: number;
  countries: number;
  pumpDealers: number;
};

/**
 * The four home-page "Network Coverage" totals, computed in Postgres by
 * `network_coverage_stats()` (migration 0014) rather than pulling every dealer
 * row to the server to count in JS. Cached on the same window as the dealer
 * data.
 */
export const getNetworkCoverageStats = unstable_cache(
  async (): Promise<NetworkCoverageStats> => {
    const { data, error } = await supabase.rpc("network_coverage_stats").single();

    if (error || !data) {
      throw new Error(
        `Failed to fetch network coverage stats: ${error?.message ?? "no rows"}`
      );
    }

    const row = data as {
      pump_models: number;
      pump_producers: number;
      countries: number;
      pump_dealers: number;
    };

    return {
      pumpModels: Number(row.pump_models),
      pumpProducers: Number(row.pump_producers),
      countries: Number(row.countries),
      pumpDealers: Number(row.pump_dealers),
    };
  },
  ["network-coverage-stats"],
  { revalidate: DEALERS_TTL, tags: ["dealers"] }
);

/** Treats null/empty/placeholder ("." or "-") values as missing. */
export function hasValue(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed !== "" && trimmed !== "." && trimmed !== "-";
}

/**
 * True when a dealer has a `removed` note that's still active: no `removed_date`
 * means the note never expires, otherwise it's active until that date passes.
 */
export function hasActiveNote(dealer: Pick<Dealer, "removed" | "removed_date">): boolean {
  if (!hasValue(dealer.removed)) return false;
  if (!dealer.removed_date) return true;
  const removedDate = new Date(dealer.removed_date);
  return !Number.isNaN(removedDate.getTime()) && removedDate.getTime() > Date.now();
}

/**
 * Normalized identity string for a dealer: (bayi_adi + bayi_ulke) lower-cased.
 * Same name in different countries is a different dealer; same name+country is
 * one. Returns null when there's no usable name.
 */
export function dealerKey(d: Pick<Dealer, "bayi_adi" | "bayi_ulke">): string | null {
  if (!hasValue(d.bayi_adi)) return null;
  const country = hasValue(d.bayi_ulke) ? d.bayi_ulke.trim().toLowerCase() : "";
  return `${d.bayi_adi.trim().toLowerCase()}|${country}`;
}

/** Normalized identity string for a pump producer (uretici), or null. */
export function producerKey(d: Pick<Dealer, "uretici">): string | null {
  return hasValue(d.uretici) ? d.uretici.trim().toLowerCase() : null;
}

/** Distinct dealers by {@link dealerKey}. */
export function countUniqueDealers(dealers: Pick<Dealer, "bayi_adi" | "bayi_ulke">[]): number {
  const seen = new Set<string>();
  for (const d of dealers) {
    const key = dealerKey(d);
    if (key) seen.add(key);
  }
  return seen.size;
}

/** Distinct pump producers by {@link producerKey}. */
export function countUniqueProducers(dealers: Pick<Dealer, "uretici">[]): number {
  const seen = new Set<string>();
  for (const d of dealers) {
    const key = producerKey(d);
    if (key) seen.add(key);
  }
  return seen.size;
}
