import { Dealer, hasValue } from "./dealers";

export type Filters = {
  pumps: string[];
  producers: string[];
  countries: string[];
  dealers: string[];
};

export const EMPTY_FILTERS: Filters = { pumps: [], producers: [], countries: [], dealers: [] };

export function isFiltersEmpty(filters: Filters): boolean {
  return (
    filters.pumps.length === 0 &&
    filters.producers.length === 0 &&
    filters.countries.length === 0 &&
    filters.dealers.length === 0
  );
}

function matches(row: Dealer, filters: Filters): boolean {
  if (filters.pumps.length > 0 && !(hasValue(row.pump) && filters.pumps.includes(row.pump))) return false;
  if (filters.producers.length > 0 && !(hasValue(row.uretici) && filters.producers.includes(row.uretici))) return false;
  if (filters.countries.length > 0 && !(hasValue(row.bayi_ulke) && filters.countries.includes(row.bayi_ulke))) return false;
  if (filters.dealers.length > 0 && !(hasValue(row.bayi_adi) && filters.dealers.includes(row.bayi_adi))) return false;
  return true;
}

export function filterDealers(dealers: Dealer[], filters: Filters): Dealer[] {
  return dealers.filter((row) => matches(row, filters));
}

type DealerStringField = "pump" | "uretici" | "bayi_ulke" | "bayi_adi";

/**
 * Distinct values for one field, computed from rows matching every OTHER
 * active filter (but not this one) — this is what makes the four filter
 * boxes cross-filter each other: picking a producer narrows the Country and
 * Dealer option lists, without narrowing its own.
 */
export function optionsFor(dealers: Dealer[], filters: Filters, field: DealerStringField, exclude: keyof Filters): string[] {
  const partial: Filters = { ...filters, [exclude]: [] };
  const rows = filterDealers(dealers, partial);
  return [...new Set(rows.map((r) => r[field]).filter(hasValue))].sort();
}
