"use client";

import { useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { EMPTY_FILTERS, Filters, filterDealers, isFiltersEmpty, optionsFor, searchDealers } from "@/lib/filters";
import { getProducerColor } from "@/lib/producerColor";
import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import IntelligenceDetailPanel from "@/components/IntelligenceDetailPanel";
import IntelligenceMap, { MAP_COLORS } from "@/components/IntelligenceMap";

type IntelligenceClientProps = {
  dealers: Dealer[];
  /** Levels 0/1/2: manufacturer/dealer fields arrive masked; hide the manufacturer facet + export. */
  restricted?: boolean;
};

/** Multi-select facets — chip groups below the dropdowns follow this same order. */
const MULTI_FILTER_LABELS: Record<"producers" | "countries" | "pumps", string> = {
  producers: "Manufacturer",
  countries: "Country",
  pumps: "Product Type",
};

const MULTI_FILTER_ORDER: ("producers" | "countries" | "pumps")[] = ["pumps", "producers", "countries"];

/** Per-filter pastel accent — trigger button when active, and the matching chip below. */
const MULTI_FILTER_COLORS: Record<"producers" | "countries" | "pumps", { trigger: string; chip: string }> = {
  producers: {
    trigger: "border-sky-200 bg-sky-50 text-slate-900",
    chip: "border-sky-200 bg-sky-50 text-sky-700",
  },
  countries: {
    trigger: "border-emerald-200 bg-emerald-50 text-slate-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  pumps: {
    trigger: "border-amber-200 bg-amber-50 text-slate-900",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
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
    <div>
      <p className="text-lg font-semibold tabular-nums text-slate-900">{value.toLocaleString()}</p>
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

export default function IntelligenceClient({ dealers, restricted = false }: IntelligenceClientProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");

  const pumpOptions = useMemo(() => optionsFor(dealers, filters, "pump", "pumps"), [dealers, filters]);
  const producerOptions = useMemo(
    () => (restricted ? [] : optionsFor(dealers, filters, "uretici", "producers")),
    [dealers, filters, restricted]
  );
  const countryOptions = useMemo(() => optionsFor(dealers, filters, "bayi_ulke", "countries"), [dealers, filters]);

  const filteredDealers = useMemo(() => filterDealers(dealers, filters), [dealers, filters]);

  // Filters + free-text search combined — drives the always-visible sidebar
  // stats so a search like "Wilden" updates the result count instantly,
  // without the user having to scroll past the map to the table.
  const visibleDealers = useMemo(() => searchDealers(filteredDealers, search), [filteredDealers, search]);

  // Countries to highlight on the map: whatever's currently visible in the
  // table (all active filters + search combined). With nothing active,
  // `visibleDealers` is the full dataset, so every country with at least one
  // record ends up highlighted by default.
  const highlightedCountries = useMemo(
    () => [...new Set(visibleDealers.map((d) => d.bayi_ulke).filter(hasValue))],
    [visibleDealers]
  );

  const summary = useMemo(
    () => ({
      dealers: new Set(visibleDealers.map((d) => d.bayi_adi).filter(hasValue)).size,
      manufacturers: new Set(visibleDealers.map((d) => d.uretici).filter(hasValue)).size,
      countries: new Set(visibleDealers.map((d) => d.bayi_ulke).filter(hasValue)).size,
      pumpModels: new Set(visibleDealers.map((d) => d.pump).filter(hasValue)).size,
    }),
    [visibleDealers]
  );

  const hasActiveFilters = !isFiltersEmpty(filters) || search.trim().length > 0;

  function handleCountryClick(country: string) {
    setFilters((f) =>
      f.countries.includes(country)
        ? { ...f, countries: f.countries.filter((c) => c !== country) }
        : { ...f, countries: [...f.countries, country] }
    );
  }

  function removeFilterValue(field: "producers" | "countries" | "pumps", value: string) {
    setFilters((f) => ({ ...f, [field]: f[field].filter((v) => v !== value) }));
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
    setSearch("");
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
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[350px_1fr]">
          {/* Filter sidebar */}
          <aside className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Filters</span>
              <button
                type="button"
                onClick={clearAll}
                disabled={!hasActiveFilters}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  hasActiveFilters
                    ? "border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700"
                    : "cursor-not-allowed border-slate-200 text-slate-400"
                }`}
              >
                Clear Filters
              </button>
            </div>

            <div className="relative">
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

            <div className="flex flex-col gap-2">
              <MultiSelectFilter
                label="Product Type"
                options={pumpOptions}
                selected={filters.pumps}
                onChange={(next) => setFilters((f) => ({ ...f, pumps: next }))}
                activeClassName={MULTI_FILTER_COLORS.pumps.trigger}
              />
              {restricted ? (
                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">
                  <span>Manufacturer</span>
                  <span className="text-xs">🔒 Locked</span>
                </div>
              ) : (
                <MultiSelectFilter
                  label="Manufacturer"
                  options={producerOptions}
                  selected={filters.producers}
                  onChange={(next) => setFilters((f) => ({ ...f, producers: next }))}
                  chipColor={getProducerColor}
                  activeClassName={MULTI_FILTER_COLORS.producers.trigger}
                />
              )}
              <MultiSelectFilter
                label="Country"
                options={countryOptions}
                selected={filters.countries}
                onChange={(next) => setFilters((f) => ({ ...f, countries: next }))}
                activeClassName={MULTI_FILTER_COLORS.countries.trigger}
              />
            </div>

            {MULTI_FILTER_ORDER.some((field) => filters[field].length > 0) && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                {MULTI_FILTER_ORDER.map((field) =>
                  filters[field].length > 0 ? (
                    <div key={field} className="flex flex-wrap items-center gap-1.5">
                      {filters[field].map((value) => (
                        <span
                          key={`${field}-${value}`}
                          className={`flex max-w-full items-center gap-1 rounded border py-1 pl-2 pr-1 text-xs ${MULTI_FILTER_COLORS[field].chip}`}
                        >
                          <span className="opacity-70">{MULTI_FILTER_LABELS[field]}:</span>
                          <span className="max-w-[9rem] truncate font-medium">{value}</span>
                          <button
                            type="button"
                            onClick={() => removeFilterValue(field, value)}
                            title={`Remove ${value}`}
                            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-y-3 border-t border-slate-100 pt-3">
              {restricted ? (
                <Stat value={visibleDealers.length} label="Listings" />
              ) : (
                <>
                  <Stat value={summary.dealers} label="Dealers" />
                  <Stat value={summary.manufacturers} label="Manufacturers" />
                </>
              )}
              <Stat value={summary.countries} label="Countries" />
              <Stat value={summary.pumpModels} label="Pump Models" />
            </div>
          </aside>

          {/* Map */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-500">Global Coverage Map</span>
              <span className="text-[11px] text-slate-400">Click a country to filter</span>
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
            </div>
          </div>
        </div>

        <div className="mt-6">
          <IntelligenceDetailPanel
            dealers={filteredDealers}
            totalCount={dealers.length}
            search={search}
            hasActiveFilters={hasActiveFilters}
            restricted={restricted}
          />
        </div>
      </div>
    </div>
  );
}
