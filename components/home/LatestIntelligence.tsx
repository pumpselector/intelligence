import Link from "next/link";
import { hasValue } from "@/lib/dealers";
import { DistributorNews, formatNewsDate } from "@/lib/news";

/** "Standard Technical Supply" -> "S.T.S." — home preview only, never the full /news list. */
function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}.`)
    .join("");
}

/** Editorial list of the most recent real network-change records — no illustrative/fake entries. */
export default function LatestIntelligence({ items }: { items: DistributorNews[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-[#F3F9FC]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#53657A]">
            Latest Intelligence
          </span>
          <Link
            href="/news"
            className="text-xs font-medium text-[#16243D] transition-colors hover:text-[#F5A900]"
          >
            View all updates →
          </Link>
        </div>

        <div className="mt-5 divide-y divide-[#DCE6ED] border-y border-[#DCE6ED]">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 px-2 py-4 transition-colors hover:bg-white sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <p className="text-base font-bold tracking-tight text-[#16243D] sm:text-lg">
                  {item.degisiklik_turu}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#53657A]">
                  {formatNewsDate(item.haber_tarihi)}
                </p>
                <p className="mt-1 truncate text-xs text-[#8A97A6]">
                  {hasValue(item.uretici) ? maskName(item.uretici) : "—"}
                  {hasValue(item.bayi_adi) ? ` — ${maskName(item.bayi_adi)}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-[#53657A]">{hasValue(item.ulke) ? item.ulke : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
