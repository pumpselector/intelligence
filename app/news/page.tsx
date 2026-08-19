import { getPublishedNews } from "@/lib/news";
import NewsClient from "@/components/NewsClient";

export default async function NewsPage() {
  const news = await getPublishedNews();

  return <NewsClient news={news} />;
}
