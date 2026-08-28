import { getAllNews } from "@/lib/news";
import { getAccess, hasFullAccess } from "@/lib/access";
import { maskNews } from "@/lib/mask";
import AccessBanner from "@/components/AccessBanner";
import NewsClient from "@/components/NewsClient";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const [news, access] = await Promise.all([getAllNews(), getAccess()]);

  const restricted = !hasFullAccess(access.level);
  const items = restricted ? news.map(maskNews) : news;

  return (
    <>
      <AccessBanner level={access.level} />
      <NewsClient news={items} restricted={restricted} />
    </>
  );
}
