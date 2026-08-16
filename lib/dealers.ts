import { supabase } from "@/lib/supabase";

export type Dealer = {
  id: number;
  created_at: string;
  satici: string;
  bayi_adi: string;
  ulke: string;
  adres: string | null;
  telefon: string | null;
  email: string | null;
  web: string | null;
  pump: string;
};

const PAGE_SIZE = 1000;

export async function getAllDealers(): Promise<Dealer[]> {
  const rows: Dealer[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dealers")
      .select("id,created_at,satici,bayi_adi,ulke,adres,telefon,email,web,pump")
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
