"use client";

import { useEffect, useMemo, useState } from "react";
import { hasValue } from "@/lib/dealers";
import { DistributorNews, formatNewsDate } from "@/lib/news";
import { getProducerColor } from "@/lib/producerColor";
import MultiSelectFilter from "@/components/ui/MultiSelectFilter";

type NewsClientProps = {
  news: DistributorNews[];
  /** Levels 0/1/2: manufacturer/dealer/detail fields arrive masked; hide the manufacturer facet. */
  restricted?: boolean;
};

const PAGE_SIZE = 20;

/** Per-filter pastel accent — trigger button when active. */
const FILTER_COLORS = {
  manufacturers: "border-sky-200 bg-sky-50 text-slate-900",
  countries: "border-emerald-200 bg-emerald-50 text-slate-900",
  changeTypes: "border-amber-200 bg-amber-50 text-slate-900",
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

export default function NewsClient({ news, restricted = false }: NewsClientProps) {
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [changeTypes, setChangeTypes] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const manufacturerOptions = useMemo(
    () =>
      [...new Set(news.map((n) => n.uretici).filter(hasValue))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [news]
  );

  const countryOptions = useMemo(
    () =>
      [...new Set(news.map((n) => n.ulke).filter(hasValue))].sort((a, b) => a.localeCompare(b)),
    [news]
  );

  const changeTypeOptions = useMemo(
    () =>
      [...new Set(news.map((n) => n.degisiklik_turu).filter(hasValue))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [news]
  );

  const hasActiveFilters = manufacturers.length > 0 || countries.length > 0 || changeTypes.length > 0;

  function clearFilters() {
    setManufacturers([]);
    setCountries([]);
    setChangeTypes([]);
  }

  const filtered = useMemo(
    () =>
      news.filter(
        (n) =>
          (manufacturers.length === 0 || (hasValue(n.uretici) && manufacturers.includes(n.uretici))) &&
          (countries.length === 0 || (hasValue(n.ulke) && countries.includes(n.ulke))) &&
          (changeTypes.length === 0 ||
            (hasValue(n.degisiklik_turu) && changeTypes.includes(n.degisiklik_turu)))
      ),
    [news, manufacturers, countries, changeTypes]
  );

  useEffect(() => {
    setPage(1);
  }, [manufacturers, countries, changeTypes]);

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

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {restricted ? (
              <div className="flex w-48 items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                <span>Pump Producer</span>
                <span className="text-xs">🔒</span>
              </div>
            ) : (
              <div className="w-48">
                <MultiSelectFilter
                  label="Pump Producer"
                  options={manufacturerOptions}
                  selected={manufacturers}
                  onChange={setManufacturers}
                  chipColor={getProducerColor}
                  activeClassName={FILTER_COLORS.manufacturers}
                />
              </div>
            )}
            <div className="w-48">
              <MultiSelectFilter
                label="Country"
                options={countryOptions}
                selected={countries}
                onChange={setCountries}
                activeClassName={FILTER_COLORS.countries}
              />
            </div>
            <div className="w-48">
              <MultiSelectFilter
                label="Change Type"
                options={changeTypeOptions}
                selected={changeTypes}
                onChange={setChangeTypes}
                activeClassName={FILTER_COLORS.changeTypes}
              />
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className={`ml-auto rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                hasActiveFilters
                  ? "border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700"
                  : "cursor-not-allowed border-slate-200 text-slate-400"
              }`}
            >
              Clear Filters
            </button>
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
