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
  bayi_lat: number | null;
  bayi_lng: number | null;
  uretici_lat: number | null;
  uretici_lng: number | null;
  status: string | null;
  first_seen: string | null;
  last_seen: string | null;
};

const PAGE_SIZE = 1000;

export async function getAllDealers(): Promise<Dealer[]> {
  const rows: Dealer[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dealers")
      .select(
        "id,created_at,uretici,bayi_adi,bayi_ulke,bayi_adres,bayi_telefon,bayi_email,bayi_web,pump,uretici_adres,uretici_ulke,bayi_lat,bayi_lng,uretici_lat,uretici_lng,status,first_seen,last_seen"
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

/** True when first_seen falls within the last `days` days (default 30) — drives the "New" badge/filter. */
export function isRecentlyAdded(firstSeen: string | null, days = 30): boolean {
  if (!firstSeen) return false;
  const firstSeenMs = new Date(firstSeen).getTime();
  if (Number.isNaN(firstSeenMs)) return false;
  const diffMs = Date.now() - firstSeenMs;
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}
