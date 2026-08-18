"use client";

import { useMemo, useState } from "react";
import { Dealer, hasValue } from "@/lib/dealers";
import { EMPTY_FILTERS, Filters, filterDealers, isFiltersEmpty, optionsFor } from "@/lib/filters";
import { getProducerColor } from "@/lib/producerColor";
import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import IntelligenceDetailPanel from "@/components/IntelligenceDetailPanel";
import IntelligenceMap from "@/components/IntelligenceMap";

type IntelligenceClientProps = {
  dealers: Dealer[];
};

export default function IntelligenceClient({ dealers }: IntelligenceClientProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const pumpOptions = useMemo(() => optionsFor(dealers, filters, "pump", "pumps"), [dealers, filters]);
  const producerOptions = useMemo(() => optionsFor(dealers, filters, "uretici", "producers"), [dealers, filters]);
  const countryOptions = useMemo(() => optionsFor(dealers, filters, "bayi_ulke", "countries"), [dealers, filters]);
  const dealerOptions = useMemo(() => optionsFor(dealers, filters, "bayi_adi", "dealers"), [dealers, filters]);

  const filteredDealers = useMemo(() => filterDealers(dealers, filters), [dealers, filters]);

  const highlightedCountries = useMemo(() => {
    if (filters.producers.length === 0) return [];
    return [...new Set(filteredDealers.map((d) => d.bayi_ulke).filter(hasValue))];
  }, [filteredDealers, filters.producers]);

  function handleCountryClick(country: string) {
    setFilters((f) =>
      f.countries.includes(country)
        ? { ...f, countries: f.countries.filter((c) => c !== country) }
        : { ...f, countries: [...f.countries, country] }
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Pump Industry Intelligence
          </span>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Global Coverage Explorer</h1>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <MultiSelectFilter
              label="Pumps"
              placeholder="All pumps"
              options={pumpOptions}
              selected={filters.pumps}
              onChange={(next) => setFilters((f) => ({ ...f, pumps: next }))}
            />
            <MultiSelectFilter
              label="Producers"
              placeholder="All producers"
              options={producerOptions}
              selected={filters.producers}
              onChange={(next) => setFilters((f) => ({ ...f, producers: next }))}
              chipColor={getProducerColor}
            />
            <MultiSelectFilter
              label="Countries"
              placeholder="All countries"
              options={countryOptions}
              selected={filters.countries}
              onChange={(next) => setFilters((f) => ({ ...f, countries: next }))}
            />
            <MultiSelectFilter
              label="Dealers"
              placeholder="All dealers"
              options={dealerOptions}
              selected={filters.dealers}
              onChange={(next) => setFilters((f) => ({ ...f, dealers: next }))}
            />
          </div>
        </div>

        {!isFiltersEmpty(filters) && (
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Clear All
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
          <IntelligenceDetailPanel dealers={filteredDealers} totalCount={dealers.length} />

          <div className="lg:sticky lg:top-6">
            <IntelligenceMap
              highlightedCountries={highlightedCountries}
              selectedCountries={filters.countries}
              onCountryClick={handleCountryClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
