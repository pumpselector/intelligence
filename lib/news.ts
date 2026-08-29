import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

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

const PAGE_SIZE = 1000;

const NEWS_COLUMNS =
  "id,haber_tarihi,uretici,bayi_adi,ulke,degisiklik_turu,pump,bayi_adres,bayi_telefon,bayi_email,bayi_web";

// Same rationale as the dealer data (see lib/dealers.ts): edited outside the
// app, so a fixed staleness window rather than event-driven invalidation.
const NEWS_TTL = 300;

/**
 * One {@link PAGE_SIZE}-row page of news, newest first, cached on its own so
 * each entry stays under Next's data-cache limit. `haber_tarihi` isn't unique,
 * so `id` is the tiebreaker — otherwise rows on a shared date could shift
 * across page boundaries and be skipped or duplicated.
 */
const getCachedNewsPage = unstable_cache(
  async (page: number): Promise<DistributorNews[]> => {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("distributor_news")
      .select(NEWS_COLUMNS)
      .order("haber_tarihi", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch distributor news (page ${page}): ${error.message}`);
    }

    return (data as DistributorNews[]) ?? [];
  },
  ["distributor-news-page"],
  { revalidate: NEWS_TTL, tags: ["distributor_news"] }
);

const getCachedNewsCount = unstable_cache(
  async (): Promise<number> => {
    const { count, error } = await supabase
      .from("distributor_news")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw new Error(`Failed to count distributor news: ${error.message}`);
    }

    return count ?? 0;
  },
  ["distributor-news-count"],
  { revalidate: NEWS_TTL, tags: ["distributor_news"] }
);

/**
 * All distributor news updates, newest first. Served from Next's data cache for
 * up to {@link NEWS_TTL} seconds; on a miss the pages are fetched in parallel.
 */
export async function getAllNews(): Promise<DistributorNews[]> {
  const count = await getCachedNewsCount();
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, page) => getCachedNewsPage(page))
  );

  return pages.flat();
}
