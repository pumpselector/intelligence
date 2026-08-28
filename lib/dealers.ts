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

export async function getAllDealers(): Promise<Dealer[]> {
  const rows: Dealer[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dealers")
      .select(
        "id,created_at,uretici,bayi_adi,bayi_ulke,bayi_adres,bayi_telefon,bayi_email,bayi_web,pump,uretici_adres,uretici_ulke,removed,removed_date"
      )
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch dealers: ${error.message}`);
    }

    rows.push(...(data as Dealer[]));

    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

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
