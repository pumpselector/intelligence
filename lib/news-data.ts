import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DistributorNews } from "@/lib/news";

/**
 * Server-only Data Access Layer for the `distributor_news` table.
 *
 * `distributor_news` has RLS enabled with no anon / authenticated SELECT policy
 * (migration 0021), so it can only be read with the service-role client. Runs
 * inside `unstable_cache`; `createAdminClient` touches neither `cookies()` nor
 * `headers()`, so that is safe.
 *
 * Rows are RAW (unmasked); callers apply `maskNews` / `maskNewsPreview` per
 * request from the viewer's access level.
 */

const PAGE_SIZE = 1000;

const NEWS_COLUMNS =
  "id,haber_tarihi,uretici,bayi_adi,ulke,degisiklik_turu,pump,bayi_adres,bayi_telefon,bayi_email,bayi_web";

// Same rationale as the dealer data (see lib/dealers-data.ts): edited outside
// the app, so a fixed staleness window rather than event-driven invalidation.
const NEWS_TTL = 300;

/**
 * One {@link PAGE_SIZE}-row page of news, newest first, cached on its own so
 * each entry stays under Next's data-cache limit. `haber_tarihi` isn't unique,
 * so `id` is the tiebreaker — otherwise rows on a shared date could shift
 * across page boundaries and be skipped or duplicated.
 */
const getCachedNewsPage = unstable_cache(
  async (page: number): Promise<DistributorNews[]> => {
    const supabase = createAdminClient();
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
    const supabase = createAdminClient();
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
