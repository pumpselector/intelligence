// Shared distributor-news type + pure helpers. NO data access here — this module
// is imported by Client Components (NewsClient, NewsCard, LatestIntelligence),
// so it must stay free of `server-only`, the Supabase client and env access.
// The actual fetching lives in lib/news-data.ts (server-only, service-role).

export type DistributorNews = {
  id: number;
  haber_tarihi: string;
  uretici: string | null;
  bayi_adi: string | null;
  ulke: string | null;
  degisiklik_turu: string;
  pump: string | null;
  bayi_adres: string | null;
  bayi_telefon: string | null;
  bayi_email: string | null;
  bayi_web: string | null;
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
