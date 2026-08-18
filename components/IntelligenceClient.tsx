"use client";

import { useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { EMPTY_FILTERS, Filters, filterDealers, isFiltersEmpty, optionsFor } from "@/lib/filters";
import { getProducerColor } from "@/lib/producerColor";
import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import IntelligenceDetailPanel from "@/components/IntelligenceDetailPanel";
import IntelligenceMap, { MAP_COLORS } from "@/components/IntelligenceMap";

type IntelligenceClientProps = {
  dealers: Dealer[];
};

const FILTER_LABELS: Record<keyof Filters, string> = {
  producers: "Manufacturer",
  countries: "Country",
  pumps: "Product Type",
  dealers: "Dealer",
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="m17 17-4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-right">
      <p className="text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">{value.toLocaleString()}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export default function IntelligenceClient({ dealers }: IntelligenceClientProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");

  const pumpOptions = useMemo(() => optionsFor(dealers, filters, "pump", "pumps"), [dealers, filters]);
  const producerOptions = useMemo(() => optionsFor(dealers, filters, "uretici", "producers"), [dealers, filters]);
  const countryOptions = useMemo(() => optionsFor(dealers, filters, "bayi_ulke", "countries"), [dealers, filters]);
  const dealerOptions = useMemo(() => optionsFor(dealers, filters, "bayi_adi", "dealers"), [dealers, filters]);

  const filteredDealers = useMemo(() => filterDealers(dealers, filters), [dealers, filters]);

  const highlightedCountries = useMemo(() => {
    if (filters.producers.length === 0) return [];
    return [...new Set(filteredDealers.map((d) => d.bayi_ulke).filter(hasValue))];
  }, [filteredDealers, filters.producers]);

  const summary = useMemo(
    () => ({
      dealers: new Set(filteredDealers.map((d) => d.bayi_adi).filter(hasValue)).size,
      manufacturers: new Set(filteredDealers.map((d) => d.uretici).filter(hasValue)).size,
      countries: new Set(filteredDealers.map((d) => d.bayi_ulke).filter(hasValue)).size,
    }),
    [filteredDealers]
  );

  const activeChips = useMemo(() => {
    const chips: { field: keyof Filters; value: string }[] = [];
    (Object.keys(filters) as (keyof Filters)[]).forEach((field) => {
      filters[field].forEach((value) => chips.push({ field, value }));
    });
    return chips;
  }, [filters]);

  function handleCountryClick(country: string) {
    setFilters((f) =>
      f.countries.includes(country)
        ? { ...f, countries: f.countries.filter((c) => c !== country) }
        : { ...f, countries: [...f.countries, country] }
    );
  }

  function removeFilterValue(field: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [field]: f[field].filter((v) => v !== value) }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="mb-6 max-w-2xl">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Pump Industry Intelligence
          </span>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            Global Pump Dealer Network
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Explore manufacturers, authorized distributors and pump dealers across markets worldwide.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dealer or manufacturer..."
                className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </div>

            <div className="hidden h-6 w-px bg-slate-200 sm:block" />

            <MultiSelectFilter
              label="Manufacturer"
              options={producerOptions}
              selected={filters.producers}
              onChange={(next) => setFilters((f) => ({ ...f, producers: next }))}
              chipColor={getProducerColor}
            />
            <MultiSelectFilter
              label="Country"
              options={countryOptions}
              selected={filters.countries}
              onChange={(next) => setFilters((f) => ({ ...f, countries: next }))}
            />
            <MultiSelectFilter
              label="Product Type"
              options={pumpOptions}
              selected={filters.pumps}
              onChange={(next) => setFilters((f) => ({ ...f, pumps: next }))}
            />
            <MultiSelectFilter
              label="Dealer"
              options={dealerOptions}
              selected={filters.dealers}
              onChange={(next) => setFilters((f) => ({ ...f, dealers: next }))}
            />

            {!isFiltersEmpty(filters) && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="ml-auto whitespace-nowrap text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
              {activeChips.map(({ field, value }) => (
                <span
                  key={`${field}-${value}`}
                  className="flex max-w-full items-center gap-1 rounded border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-xs text-slate-700"
                >
                  <span className="text-slate-400">{FILTER_LABELS[field]}:</span>
                  <span className="max-w-[10rem] truncate font-medium text-slate-800">{value}</span>
                  <button
                    type="button"
                    onClick={() => removeFilterValue(field, value)}
                    title={`Remove ${value}`}
                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-3">
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Global Coverage</span>
            <div className="flex items-center gap-6">
              <Stat value={summary.dealers} label="Dealers" />
              <Stat value={summary.manufacturers} label="Manufacturers" />
              <Stat value={summary.countries} label="Countries" />
            </div>
          </div>

          <IntelligenceMap
            highlightedCountries={highlightedCountries}
            selectedCountries={filters.countries}
            onCountryClick={handleCountryClick}
          />

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-500">
            <LegendDot color={MAP_COLORS.selected} label="Selected" />
            <LegendDot color={MAP_COLORS.inResults} label="In results" />
            <LegendDot color={MAP_COLORS.noMatch} label="No coverage" />
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">Click a country to filter</span>
          </div>
        </div>

        <div className="mt-6">
          <IntelligenceDetailPanel dealers={filteredDealers} totalCount={dealers.length} search={search} />
        </div>
      </div>
    </div>
  );
}
