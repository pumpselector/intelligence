"use client";

import { useMemo, useState } from "react";
import { hasValue } from "@/lib/dealers";
import { DistributorNews, formatNewsDate } from "@/lib/news";
import { getProducerColor } from "@/lib/producerColor";

type NewsClientProps = {
  news: DistributorNews[];
};

function NewsCard({ item }: { item: DistributorNews }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="inline-flex shrink-0 items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
          {item.degisiklik_turu}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {formatNewsDate(item.haber_tarihi)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          {hasValue(item.uretici) && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: getProducerColor(item.uretici) }}
            />
          )}
          <p className="text-lg font-bold text-slate-900">
            {hasValue(item.uretici) ? item.uretici : "—"}
          </p>
        </div>

        <p className="text-lg font-medium text-slate-700">
          {hasValue(item.bayi_adi) ? item.bayi_adi : "—"}
          {hasValue(item.ulke) && (
            <span className="ml-1 text-sm font-normal text-slate-400">· {item.ulke}</span>
          )}
        </p>
      </div>

      {hasValue(item.detay) && (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {item.detay}
        </p>
      )}
    </div>
  );
}

export default function NewsClient({ news }: NewsClientProps) {
  const [manufacturer, setManufacturer] = useState("all");

  const manufacturers = useMemo(
    () =>
      [...new Set(news.map((n) => n.uretici).filter(hasValue))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [news]
  );

  const filtered = useMemo(
    () => (manufacturer === "all" ? news : news.filter((n) => n.uretici === manufacturer)),
    [news, manufacturer]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">What&apos;s New</span>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
              Distributor Network Updates
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Recent changes across the authorized dealer and distributor network.
            </p>
          </div>

          {manufacturers.length > 0 && (
            <select
              aria-label="Manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-400"
            >
              <option value="all">All manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              No updates found.
            </div>
          )}
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
