import Hero from "@/components/Hero";
import NetworkCoverage from "@/components/home/NetworkCoverage";
import LatestIntelligence from "@/components/home/LatestIntelligence";
import ProductPillars from "@/components/home/ProductPillars";
import FinalCta from "@/components/home/FinalCta";
import { countUniqueDealers, getAllDealers, hasValue } from "@/lib/dealers";
import { getAllNews } from "@/lib/news";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [dealers, news] = await Promise.all([getAllDealers(), getAllNews()]);

  const stats = [
    { label: "Pump Models", value: new Set(dealers.map((d) => d.pump).filter(hasValue)).size },
    { label: "Manufacturers", value: new Set(dealers.map((d) => d.uretici).filter(hasValue)).size },
    { label: "Countries", value: new Set(dealers.map((d) => d.bayi_ulke).filter(hasValue)).size },
    { label: "Distributors", value: countUniqueDealers(dealers) },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <NetworkCoverage stats={stats} />
      <LatestIntelligence items={news.slice(0, 3)} />
      <ProductPillars />
      <FinalCta />
    </main>
  );
}
