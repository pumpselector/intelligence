import { supabase } from "@/lib/supabase";

export type DistributorNews = {
  id: number;
  haber_tarihi: string;
  uretici: string | null;
  bayi_adi: string | null;
  ulke: string | null;
  degisiklik_turu: string;
  pump: string | null;
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

/**
 * "August 19, 2026" — haber_tarihi is a date column, but Supabase serializes it
 * as "YYYY-MM-DDT00:00:00+00:00". Parse the leading YYYY-MM-DD directly instead
 * of `new Date(value)`, so the day never shifts under a non-UTC local timezone.
 */
export function formatNewsDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}, ${year}`;
}

const PAGE_SIZE = 1000;

/** All distributor news updates, newest first. */
export async function getAllNews(): Promise<DistributorNews[]> {
  const rows: DistributorNews[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("distributor_news")
      .select("id,haber_tarihi,uretici,bayi_adi,ulke,degisiklik_turu,pump,detay")
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
