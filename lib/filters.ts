import { Dealer, hasValue, isRecentlyAdded } from "./dealers";

export type StatusFilterValue = "all" | "active" | "new" | "inactive";

export type Filters = {
  pumps: string[];
  producers: string[];
  countries: string[];
  status: StatusFilterValue;
};

export const EMPTY_FILTERS: Filters = { pumps: [], producers: [], countries: [], status: "all" };

export function isFiltersEmpty(filters: Filters): boolean {
  return (
    filters.pumps.length === 0 &&
    filters.producers.length === 0 &&
    filters.countries.length === 0 &&
    filters.status === "all"
  );
}

function matchesStatus(row: Dealer, status: StatusFilterValue): boolean {
  if (status === "all") return true;
  if (status === "inactive") return row.status === "inactive";
  const isNew = row.status === "active" && isRecentlyAdded(row.first_seen);
  if (status === "new") return isNew;
  return row.status === "active" && !isNew; // "active"
}

function matches(row: Dealer, filters: Filters): boolean {
  if (filters.pumps.length > 0 && !(hasValue(row.pump) && filters.pumps.includes(row.pump))) return false;
  if (filters.producers.length > 0 && !(hasValue(row.uretici) && filters.producers.includes(row.uretici))) return false;
  if (filters.countries.length > 0 && !(hasValue(row.bayi_ulke) && filters.countries.includes(row.bayi_ulke))) return false;
  if (!matchesStatus(row, filters.status)) return false;
  return true;
}

export function filterDealers(dealers: Dealer[], filters: Filters): Dealer[] {
  return dealers.filter((row) => matches(row, filters));
}

const SEARCHABLE_FIELDS: (keyof Pick<Dealer, "uretici" | "bayi_ulke" | "pump" | "bayi_adi">)[] = [
  "uretici",
  "bayi_ulke",
  "pump",
  "bayi_adi",
];

/** Free-text match across manufacturer, country, pump type and dealer name. */
export function searchDealers(dealers: Dealer[], search: string): Dealer[] {
  const q = search.trim().toLowerCase();
  if (!q) return dealers;
  return dealers.filter((row) =>
    SEARCHABLE_FIELDS.some((field) => {
      const value = row[field];
      return hasValue(value) && value.toLowerCase().includes(q);
    })
  );
}

type DealerStringField = "pump" | "uretici" | "bayi_ulke" | "bayi_adi";

/**
 * Distinct values for one field, computed from rows matching every OTHER
 * active filter (but not this one) — this is what makes the three filter
 * boxes cross-filter each other: picking a producer narrows the Country and
 * Product Type option lists, without narrowing its own.
 */
export function optionsFor(dealers: Dealer[], filters: Filters, field: DealerStringField, exclude: keyof Filters): string[] {
  const partial: Filters = { ...filters, [exclude]: [] };
  const rows = filterDealers(dealers, partial);
  return [...new Set(rows.map((r) => r[field]).filter(hasValue))].sort();
}
