import { getAllNews } from "@/lib/news";
import NewsClient from "@/components/NewsClient";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await getAllNews();

  return <NewsClient news={news} />;
}
