import { supabase } from "@/lib/supabase";

export type ChangeType =
  | "eklendi"
  | "silindi"
  | "telefon_degisti"
  | "email_degisti"
  | "web_degisti"
  | "adres_degisti"
  | "yetkili_degisti";

export type DistributorNews = {
  id: number;
  haber_tarihi: string;
  uretici: string | null;
  bayi_adi: string | null;
  ulke: string | null;
  degisiklik_turu: ChangeType;
  eski_deger: string | null;
  yeni_deger: string | null;
  detay: string | null;
  yayinlandi: boolean;
  dealer_code: string | null;
  relationship_code: string | null;
};

/** DB enum -> English label shown in the UI. */
export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  eklendi: "Distributor Added",
  silindi: "Distributor Removed",
  telefon_degisti: "Phone Number Updated",
  email_degisti: "Email Updated",
  web_degisti: "Website Updated",
  adres_degisti: "Address Updated",
  yetkili_degisti: "Contact Person Updated",
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

/** "August 19, 2026" — parses the leading YYYY-MM-DD directly so the date never shifts a day under a non-UTC local timezone. */
export function formatNewsDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}, ${year}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const PAGE_SIZE = 1000;

/** Published updates, newest first. */
export async function getPublishedNews(): Promise<DistributorNews[]> {
  const rows: DistributorNews[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("distributor_news")
      .select(
        "id,haber_tarihi,uretici,bayi_adi,ulke,degisiklik_turu,eski_deger,yeni_deger,detay,yayinlandi,dealer_code,relationship_code"
      )
      .eq("yayinlandi", true)
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
