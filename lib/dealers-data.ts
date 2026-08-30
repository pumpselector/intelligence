import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Dealer, NetworkCoverageStats } from "@/lib/dealers";

/**
 * Server-only Data Access Layer for the `dealers` table.
 *
 * `dealers` has RLS enabled with no anon / authenticated SELECT policy
 * (migration 0021), so it can only be read with the service-role client. Every
 * function here runs inside `unstable_cache`, which is fine: `createAdminClient`
 * touches neither `cookies()` nor `headers()`.
 *
 * Rows are RAW (unmasked). Callers (app/intelligence/page.tsx, app/page.tsx)
 * apply `maskDealer` per request from the viewer's access level, so restricted
 * users never receive real values even though the fetch is shared.
 */

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
    const supabase = createAdminClient();
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
    const supabase = createAdminClient();
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
 */
export async function getAllDealers(): Promise<Dealer[]> {
  const count = await getCachedDealerCount();
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, page) => getCachedDealerPage(page))
  );

  return pages.flat();
}

/**
 * The four home-page "Network Coverage" totals, computed in Postgres by
 * `network_coverage_stats()` (migrations 0014 / 0021) rather than pulling every
 * dealer row to the server to count in JS. Cached on the same window as the
 * dealer data.
 */
export const getNetworkCoverageStats = unstable_cache(
  async (): Promise<NetworkCoverageStats> => {
    const supabase = createAdminClient();
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
