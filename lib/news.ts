import { supabase } from "@/lib/supabase";

export type DistributorNews = {
  id: number;
  haber_tarihi: string;
  uretici: string | null;
  bayi_adi: string | null;
  ulke: string | null;
  degisiklik_turu: string;
  detay: string | null;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "August 19, 2026" — haber_tarihi is a plain "date" column (no time/timezone). */
export function formatNewsDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

const PAGE_SIZE = 1000;

/** All distributor news updates, newest first. */
export async function getAllNews(): Promise<DistributorNews[]> {
  const rows: DistributorNews[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("distributor_news")
      .select("id,haber_tarihi,uretici,bayi_adi,ulke,degisiklik_turu,detay")
      .order("haber_tarihi", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch distributor news: ${error.message}`);
    }

    rows.push(...(data as DistributorNews[]));

    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}
