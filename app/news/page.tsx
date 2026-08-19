import { getPublishedNews } from "@/lib/news";
import NewsClient from "@/components/NewsClient";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await getPublishedNews();

  return <NewsClient news={news} />;
}
