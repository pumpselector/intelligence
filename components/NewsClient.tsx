"use client";

import { useEffect, useMemo, useState } from "react";
import { hasValue } from "@/lib/dealers";
import { DistributorNews, formatNewsDate } from "@/lib/news";
import { getProducerColor } from "@/lib/producerColor";

type NewsClientProps = {
  news: DistributorNews[];
};

const PAGE_SIZE = 20;

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

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Pump Type</p>
          <p className="text-base font-medium text-slate-700">{hasValue(item.pump) ? item.pump : "—"}</p>
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

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-slate-400"
    >
      <option value="all">{`All ${label}`}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default function NewsClient({ news }: NewsClientProps) {
  const [manufacturer, setManufacturer] = useState("all");
  const [country, setCountry] = useState("all");
  const [changeType, setChangeType] = useState("all");
  const [page, setPage] = useState(1);

  const manufacturers = useMemo(
    () =>
      [...new Set(news.map((n) => n.uretici).filter(hasValue))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [news]
  );

  const countries = useMemo(
    () =>
      [...new Set(news.map((n) => n.ulke).filter(hasValue))].sort((a, b) => a.localeCompare(b)),
    [news]
  );

  const changeTypes = useMemo(
    () =>
      [...new Set(news.map((n) => n.degisiklik_turu).filter(hasValue))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [news]
  );

  const filtered = useMemo(
    () =>
      news.filter(
        (n) =>
          (manufacturer === "all" || n.uretici === manufacturer) &&
          (country === "all" || n.ulke === country) &&
          (changeType === "all" || n.degisiklik_turu === changeType)
      ),
    [news, manufacturer, country, changeType]
  );

  useEffect(() => {
    setPage(1);
  }, [manufacturer, country, changeType]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        <div className="mb-6">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500">What&apos;s New</span>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            Distributor Network Updates
          </h1>

          <div className="mt-4 flex flex-wrap gap-3">
            <FilterSelect
              label="Manufacturers"
              value={manufacturer}
              options={manufacturers}
              onChange={setManufacturer}
            />
            <FilterSelect label="Countries" value={country} options={countries} onChange={setCountry} />
            <FilterSelect
              label="Change Types"
              value={changeType}
              options={changeTypes}
              onChange={setChangeType}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {paged.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
              No updates found.
            </div>
          )}
          {paged.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>

        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
