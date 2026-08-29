import { getAllNews } from "@/lib/news";
import { getAccess, hasFullAccess } from "@/lib/access";
import { maskNews } from "@/lib/mask";
import AccessBanner from "@/components/AccessBanner";
import NewsClient from "@/components/NewsClient";

// Rendered per request via `getAccess()` (session-dependent masking), but not
// `force-dynamic` — that would disable the `unstable_cache` around
// `getAllNews()`. See app/intelligence/page.tsx for the full rationale.

export default async function NewsPage() {
  const [news, access] = await Promise.all([getAllNews(), getAccess()]);

  const restricted = !hasFullAccess(access.level);
  const items = restricted ? news.map(maskNews) : news;

  return (
    <>
      <AccessBanner level={access.level} emailVerified={access.emailVerified} />
      <NewsClient news={items} restricted={restricted} />
    </>
  );
}
