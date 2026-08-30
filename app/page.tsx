import Hero from "@/components/Hero";
import NetworkCoverage from "@/components/home/NetworkCoverage";
import LatestIntelligence from "@/components/home/LatestIntelligence";
import ProductPillars from "@/components/home/ProductPillars";
import PricingPreview from "@/components/home/PricingPreview";
import FinalCta from "@/components/home/FinalCta";
import { getNetworkCoverageStats } from "@/lib/dealers-data";
import { getAllNews } from "@/lib/news-data";
import { maskNewsPreview } from "@/lib/mask";

// The landing page has no per-request data (the counts and the news preview are
// the same for everyone), so it's prerendered and refreshed on a 5-minute ISR
// cycle instead of being rebuilt on every visit.
export const revalidate = 300;

export default async function Home() {
  const [coverage, news] = await Promise.all([getNetworkCoverageStats(), getAllNews()]);

  const stats = [
    { label: "Pump Models", value: coverage.pumpModels },
    { label: "Pump Producers", value: coverage.pumpProducers },
    { label: "Countries", value: coverage.countries },
    { label: "Pump Dealers", value: coverage.pumpDealers },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <NetworkCoverage stats={stats} />
      <LatestIntelligence items={news.slice(0, 5).map(maskNewsPreview)} />
      <ProductPillars />
      <PricingPreview />
      <FinalCta />
    </main>
  );
}
