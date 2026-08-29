import Link from "next/link";
import { DistributorNews } from "@/lib/news";
import NewsCard from "@/components/NewsCard";

/**
 * Home-page preview of the most recent real network-change records. Rows arrive
 * already preview-masked (see lib/mask.ts → maskNewsPreview) and use the exact
 * same NewsCard as the full /news list.
 */
export default function LatestIntelligence({ items }: { items: DistributorNews[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-[#F3F9FC]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#53657A]">
            Latest Changes in Dealers
          </span>
          <Link
            href="/news"
            className="text-xs font-medium text-[#16243D] transition-colors hover:text-[#F5A900]"
          >
            View all updates →
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
