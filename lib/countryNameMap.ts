/**
 * The world-atlas@2 countries-110m topojson (used by the mini map) names
 * some countries differently than dealers.bayi_ulke / uretici_ulke does
 * (e.g. "United States" vs "United States of America"). This maps between
 * the two only where they differ — verified against the live topojson and
 * the actual distinct country values in the dealers table.
 *
 * A handful of small island nations/territories in the DB (Aruba, Bahrain,
 * Barbados, Bermuda, Guam, Hong Kong, Maldives, Malta, Mauritius,
 * Seychelles, Singapore, Virgin Islands (British)) have no renderable shape
 * at 110m resolution — they simply won't highlight/click on the map, but
 * remain selectable via the Countries filter dropdown.
 */
export const DB_TO_GEO_NAME: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Dominican Republic": "Dominican Rep.",
  "Ivory Coast": "Côte d'Ivoire",
  "North Macedonia": "Macedonia",
  "Republic of the Congo": "Congo",
  "Tanzania, United Republic of": "Tanzania",
  "United States": "United States of America",
};

const GEO_TO_DB_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(DB_TO_GEO_NAME).map(([db, geo]) => [geo, db])
);

/** DB country name -> topojson `properties.name` (identity if no alias is needed). */
export function dbNameToGeoName(dbName: string): string {
  return DB_TO_GEO_NAME[dbName] ?? dbName;
}

/** Topojson `properties.name` -> DB country name (identity if no alias is needed). */
export function geoNameToDbName(geoName: string): string {
  return GEO_TO_DB_NAME[geoName] ?? geoName;
}
