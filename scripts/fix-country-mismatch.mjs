// Finds dealers rows whose geocoded coordinates land implausibly far from
// the country the row actually claims (e.g. bayi_ulke = Mexico but
// bayi_lat/bayi_lng point into the US) and replaces them with that
// country's centroid + a small random jitter, so the row at least renders
// in roughly the right place until it can be re-geocoded properly.
//
// Only checks bayi_lat/bayi_lng against bayi_ulke. uretici_lat/uretici_lng
// is intentionally NOT checked — those coordinates come from manually
// verified producer addresses, not bulk geocoding, so they're trusted as-is.
//
// The mismatch distance threshold is larger for geographically big countries
// (a geocode landing 2000km from the centroid of Russia or the US can still
// be a legitimate address within that country) and smaller for everyone else.
//
// Rows sharing the exact same (lat, lng, country) triple are grouped and
// corrected together with a single shared replacement point.
//
// Usage:
//   node scripts/fix-country-mismatch.mjs            dry-run: reports how
//     many rows/groups would be affected, writes nothing.
//   node scripts/fix-country-mismatch.mjs --apply     applies the fix.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.geocode (same as geocode.mjs).
//
// NOTE: the centroid table below mirrors lib/countryCentroids.ts. It is
// duplicated here (rather than imported) because this script runs under
// plain `node`, which cannot import a .ts module directly. Keep both in
// sync if either changes.

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env.geocode"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Eksik ortam degiskeni: NEXT_PUBLIC_SUPABASE_URL (.env.local) ve/veya SUPABASE_SERVICE_ROLE_KEY (.env.geocode) bulunamadi."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const APPLY = process.argv.includes("--apply");
const PAGE_SIZE = 1000;
const DEFAULT_THRESHOLD_KM = 1500;
const LARGE_COUNTRY_THRESHOLD_KM = 4000;
const JITTER_DEGREES = 1;

// Geographically large countries where a geocode can legitimately land far
// from the country centroid — use the wider threshold for these.
const LARGE_COUNTRIES = new Set([
  "United States",
  "Canada",
  "Brazil",
  "Australia",
  "Russia",
  "China",
  "India",
  "Argentina",
  "Kazakhstan",
  "Algeria",
  "Democratic Republic of the Congo",
  "Saudi Arabia",
  "Mexico",
  "Indonesia",
]);

function thresholdForCountry(country) {
  return LARGE_COUNTRIES.has(country) ? LARGE_COUNTRY_THRESHOLD_KM : DEFAULT_THRESHOLD_KM;
}

const COUNTRY_CENTROIDS = {
  "Algeria": [28, 3],
  "Angola": [-12.5, 18.5],
  "Argentina": [-34, -64],
  "Aruba": [12.5, -69.97],
  "Australia": [-27, 133],
  "Austria": [47.33, 13.33],
  "Azerbaijan": [40.5, 47.5],
  "Bahamas": [24.25, -76],
  "Bahrain": [26, 50.55],
  "Bangladesh": [24, 90],
  "Barbados": [13.17, -59.53],
  "Belarus": [53, 28],
  "Belgium": [50.83, 4],
  "Belize": [17.25, -88.75],
  "Bermuda": [32.33, -64.75],
  "Bolivia": [-17, -65],
  "Bosnia and Herzegovina": [44, 18],
  "Brazil": [-10, -55],
  "Bulgaria": [43, 25],
  "Burkina Faso": [13, -2],
  "Cambodia": [13, 105],
  "Canada": [60, -95],
  "Chile": [-30, -71],
  "China": [35, 105],
  "Colombia": [4, -72],
  "Costa Rica": [10, -84],
  "Croatia": [45.17, 15.5],
  "Cyprus": [35, 33],
  "Czechia": [49.75, 15.5],
  "Democratic Republic of the Congo": [0, 25],
  "Denmark": [56, 10],
  "Dominican Republic": [19, -70.67],
  "Ecuador": [-2, -77.5],
  "Egypt": [27, 30],
  "El Salvador": [13.83, -88.92],
  "Estonia": [59, 26],
  "Finland": [64, 26],
  "France": [46, 2],
  "Georgia": [42, 43.5],
  "Germany": [51, 9],
  "Ghana": [8, -2],
  "Greece": [39, 22],
  "Guam": [13.47, 144.78],
  "Guatemala": [15.5, -90.25],
  "Guinea": [11, -10],
  "Guyana": [5, -59],
  "Haiti": [19, -72.42],
  "Honduras": [15, -86.5],
  "Hong Kong": [22.27, 114.19],
  "Hungary": [47, 20],
  "Iceland": [65, -18],
  "India": [20, 77],
  "Indonesia": [-5, 120],
  "Iraq": [33, 44],
  "Ireland": [53, -8],
  "Israel": [31.47, 35.13],
  "Italy": [42.83, 12.83],
  "Ivory Coast": [8, -5],
  "Jamaica": [18.25, -77.5],
  "Japan": [36, 138],
  "Jordan": [31, 36],
  "Kazakhstan": [48, 68],
  "Kenya": [1, 38],
  "Kuwait": [29.5, 45.75],
  "Latvia": [57, 25],
  "Lebanon": [33.83, 35.83],
  "Libya": [25, 17],
  "Lithuania": [56, 24],
  "Luxembourg": [49.75, 6.17],
  "Malaysia": [2.5, 112.5],
  "Maldives": [3.25, 73],
  "Mali": [17, -4],
  "Malta": [35.83, 14.58],
  "Mauritius": [-20.28, 57.55],
  "Mexico": [23, -102],
  "Montenegro": [42.5, 19.3],
  "Morocco": [32, -5],
  "Mozambique": [-18.25, 35],
  "Namibia": [-22, 17],
  "Netherlands": [52.5, 5.75],
  "New Zealand": [-41, 174],
  "Nicaragua": [13, -85],
  "Nigeria": [10, 8],
  "North Macedonia": [41.83, 22],
  "Norway": [62, 10],
  "Oman": [21, 57],
  "Pakistan": [30, 70],
  "Panama": [9, -80],
  "Paraguay": [-23, -58],
  "Peru": [-10, -76],
  "Philippines": [13, 122],
  "Poland": [52, 20],
  "Portugal": [39.5, -8],
  "Puerto Rico": [18.25, -66.5],
  "Qatar": [25.5, 51.25],
  "Republic of the Congo": [-1, 15],
  "Romania": [46, 25],
  "Russia": [60, 100],
  "Saudi Arabia": [25, 45],
  "Senegal": [14, -14],
  "Serbia": [44, 21],
  "Seychelles": [-4.58, 55.67],
  "Sierra Leone": [8.5, -11.5],
  "Singapore": [1.37, 103.8],
  "Slovakia": [48.67, 19.5],
  "Slovenia": [46.12, 14.82],
  "South Africa": [-29, 24],
  "South Korea": [37, 127.5],
  "Spain": [40, -4],
  "Sri Lanka": [7, 81],
  "Sweden": [62, 15],
  "Switzerland": [47, 8],
  "Syria": [35, 38],
  "Taiwan": [23.5, 121],
  "Tanzania, United Republic of": [-6, 35],
  "Thailand": [15, 100],
  "Trinidad and Tobago": [11, -61],
  "Tunisia": [34, 9],
  "Turkey": [39, 35],
  "Turkmenistan": [40, 60],
  "Ukraine": [49, 32],
  "United Arab Emirates": [24, 54],
  "United Kingdom": [54, -2],
  "United States": [38, -97],
  "Uruguay": [-33, -56],
  "Venezuela": [8, -66],
  "Vietnam": [16.17, 107.83],
  "Virgin Islands (British)": [18.43, -64.62],
  "Yemen": [15, 48],
  "Zambia": [-15, 30],
};

/** Treats null/empty/placeholder ("." or "-") values as missing. */
function hasValue(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  return trimmed !== "" && trimmed !== "." && trimmed !== "-";
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function jitteredCentroid([lat, lng]) {
  const jitter = () => (Math.random() * 2 - 1) * JITTER_DEGREES;
  return { lat: lat + jitter(), lng: lng + jitter() };
}

/** Groups rows sharing the exact same (lat, lng, country) triple so duplicates get one shared fix. */
function groupByCoordAndCountry(rows, latField, lngField, countryField) {
  const groups = new Map();
  for (const row of rows) {
    const lat = row[latField];
    const lng = row[lngField];
    const country = row[countryField];
    if (lat == null || lng == null || !hasValue(country)) continue;
    const key = `${lat}|${lng}|${country}`;
    let group = groups.get(key);
    if (!group) {
      group = { lat, lng, country, ids: [] };
      groups.set(key, group);
    }
    group.ids.push(row.id);
  }
  return [...groups.values()];
}

function findMismatches(groups) {
  const mismatches = [];
  const countriesWithoutCentroid = new Set();
  for (const g of groups) {
    const centroid = COUNTRY_CENTROIDS[g.country];
    if (!centroid) {
      countriesWithoutCentroid.add(g.country);
      continue;
    }
    const distanceKm = haversineDistanceKm(g.lat, g.lng, centroid[0], centroid[1]);
    const threshold = thresholdForCountry(g.country);
    if (distanceKm > threshold) {
      mismatches.push({ ...g, centroid, distanceKm, threshold });
    }
  }
  return { mismatches, countriesWithoutCentroid };
}

async function fetchAllDealers() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dealers")
      .select("id,bayi_lat,bayi_lng,bayi_ulke")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Dealers cekilemedi: ${error.message}`);

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function applyFix(fieldLabel, latColumn, lngColumn, mismatches) {
  let updatedRows = 0;
  let failedGroups = 0;

  for (const m of mismatches) {
    const replacement = jitteredCentroid(m.centroid);
    const { error } = await supabase
      .from("dealers")
      .update({ [latColumn]: replacement.lat, [lngColumn]: replacement.lng })
      .in("id", m.ids);

    if (error) {
      failedGroups++;
      console.warn(`  ! ${fieldLabel} guncellenemedi (${m.country}, ${m.ids.length} satir): ${error.message}`);
    } else {
      updatedRows += m.ids.length;
    }
  }

  return { updatedRows, failedGroups };
}

function reportMismatches(fieldLabel, mismatches, countriesWithoutCentroid) {
  const totalRows = mismatches.reduce((sum, m) => sum + m.ids.length, 0);
  console.log(`\n== ${fieldLabel} ==`);
  console.log(`${mismatches.length} farkli koordinat/ulke grubu uyusmuyor (${totalRows} satir etkilenecek).`);

  for (const m of mismatches
    .slice()
    .sort((a, b) => b.distanceKm - a.distanceKm)
    .slice(0, 20)) {
    console.log(
      `  - ${m.country}: kayitli (${m.lat.toFixed(2)}, ${m.lng.toFixed(2)}) merkezden ${Math.round(
        m.distanceKm
      )} km uzakta (esik: ${m.threshold} km) (${m.ids.length} satir, id ornek: ${m.ids
        .slice(0, 5)
        .join(", ")}${m.ids.length > 5 ? ", ..." : ""})`
    );
  }
  if (mismatches.length > 20) {
    console.log(`  ... ve ${mismatches.length - 20} grup daha.`);
  }

  if (countriesWithoutCentroid.size > 0) {
    console.log(
      `Not: centroid verisi olmayan ${countriesWithoutCentroid.size} ulke icin kontrol atlandi: ${[
        ...countriesWithoutCentroid,
      ].join(", ")}`
    );
  }

  return totalRows;
}

async function main() {
  console.log(APPLY ? "Mod: --apply (degisiklikler yazilacak)" : "Mod: dry-run (hicbir sey yazilmayacak)");
  console.log("Dealers tablosu okunuyor...");
  const rows = await fetchAllDealers();
  console.log(`${rows.length} satir okundu.\n`);

  const bayiGroups = groupByCoordAndCountry(rows, "bayi_lat", "bayi_lng", "bayi_ulke");
  const { mismatches: bayiMismatches, countriesWithoutCentroid: bayiNoCentroid } = findMismatches(bayiGroups);
  const bayiRowCount = reportMismatches("Bayi koordinat/ulke uyusmazliklari", bayiMismatches, bayiNoCentroid);

  console.log("\n== Ozet ==");
  console.log(`Bayi: ${bayiMismatches.length} grup / ${bayiRowCount} satir uyusmuyor.`);

  if (!APPLY) {
    console.log("\nDegisiklik yapilmadi (dry-run). Uygulamak icin --apply ile calistirin.");
    return;
  }

  console.log("\nDuzeltmeler uygulaniyor...");
  const bayiResult = await applyFix("bayi_lat/bayi_lng", "bayi_lat", "bayi_lng", bayiMismatches);

  console.log(
    `Bayi: ${bayiResult.updatedRows} satir guncellendi${
      bayiResult.failedGroups > 0 ? `, ${bayiResult.failedGroups} grup basarisiz` : ""
    }.`
  );
  console.log("\nTamamlandi.");
}

main().catch((err) => {
  console.error("Script hata ile durdu:", err);
  process.exit(1);
});
