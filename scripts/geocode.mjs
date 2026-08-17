// Geocodes dealers.bayi_adres and dealers.uretici_adres (producer addresses
// are cached per distinct address) via OpenStreetMap Nominatim, then writes
// the resulting lat/lng back to Supabase.
//
// Usage: npm run geocode
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.geocode (never committed) and
// NEXT_PUBLIC_SUPABASE_URL in .env.local.

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

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PumpIntelligenceApp/1.0 (contact: nevsal@gmail.com)";
const RATE_LIMIT_MS = 1100;
const PAGE_SIZE = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Treats null/empty/placeholder ("." or "-") values as missing. */
function hasValue(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  return trimmed !== "" && trimmed !== "." && trimmed !== "-";
}

async function geocodeAddress(address) {
  const url = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(address)}`;
  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
  } finally {
    // Always wait out the rate limit, even if the request failed.
    await sleep(RATE_LIMIT_MS);
  }

  if (!response.ok) {
    console.warn(`  ! Nominatim ${response.status} yaniti: "${address}"`);
    return null;
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const lat = Number(results[0].lat);
  const lon = Number(results[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

  return { lat, lon };
}

async function getTotalDealerCount() {
  const { count, error } = await supabase
    .from("dealers")
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(`Dealer sayisi alinamadi: ${error.message}`);
  return count ?? 0;
}

/** Fetches only rows missing bayi_lat/lng and/or uretici_lat/lng. */
async function fetchDealersNeedingGeocode() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dealers")
      .select("id,bayi_adres,uretici_adres,bayi_lat,bayi_lng,uretici_lat,uretici_lng")
      .or("bayi_lat.is.null,bayi_lng.is.null,uretici_lat.is.null,uretici_lng.is.null")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Dealers cekilemedi: ${error.message}`);

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  console.log("Dealers tablosu okunuyor...");
  const totalCount = await getTotalDealerCount();
  const rows = await fetchDealersNeedingGeocode();
  const total = rows.length;

  const needBayi = rows.filter(
    (r) => (r.bayi_lat == null || r.bayi_lng == null) && hasValue(r.bayi_adres)
  ).length;
  const needUretici = rows.filter(
    (r) => (r.uretici_lat == null || r.uretici_lng == null) && hasValue(r.uretici_adres)
  ).length;
  const skipped = totalCount - total;

  console.log(
    `${total} satir islenecek (${skipped} satir zaten dolu, atlaniyor). ` +
      `Toplam ${totalCount} satir - eksik bayi konumu: ${needBayi}, eksik uretici konumu: ${needUretici}.\n`
  );

  const unresolvedBayi = [];
  const unresolvedUretici = [];

  // --- Pass 1: dealer addresses — one geocode lookup per row ---
  console.log("== Bayi adresleri geocode ediliyor ==");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row.bayi_lat == null || row.bayi_lng == null) {
      if (hasValue(row.bayi_adres)) {
        try {
          const coords = await geocodeAddress(row.bayi_adres);
          if (coords) {
            const { error } = await supabase
              .from("dealers")
              .update({ bayi_lat: coords.lat, bayi_lng: coords.lon })
              .eq("id", row.id);
            if (error) {
              console.warn(`  ! id=${row.id} guncellenemedi: ${error.message}`);
              unresolvedBayi.push({ id: row.id, adres: row.bayi_adres });
            }
          } else {
            unresolvedBayi.push({ id: row.id, adres: row.bayi_adres });
          }
        } catch (err) {
          console.warn(`  ! id=${row.id} geocode hatasi: ${err.message}`);
          unresolvedBayi.push({ id: row.id, adres: row.bayi_adres });
        }
      }
    }

    console.log(`${i + 1}/${total} tamamlandi`);
  }

  // --- Pass 2: producer addresses — geocoded once per distinct address ---
  console.log("\n== Uretici adresleri geocode ediliyor (adres basina cache) ==");

  const producerGroups = new Map(); // uretici_adres -> [row id, ...]
  for (const row of rows) {
    if ((row.uretici_lat == null || row.uretici_lng == null) && hasValue(row.uretici_adres)) {
      const key = row.uretici_adres.trim();
      if (!producerGroups.has(key)) producerGroups.set(key, []);
      producerGroups.get(key).push(row.id);
    }
  }

  const producerAddresses = [...producerGroups.keys()];
  console.log(`${producerAddresses.length} benzersiz uretici adresi bulundu.\n`);

  for (let i = 0; i < producerAddresses.length; i++) {
    const address = producerAddresses[i];
    const ids = producerGroups.get(address);

    try {
      const coords = await geocodeAddress(address);
      if (coords) {
        for (const id of ids) {
          const { error } = await supabase
            .from("dealers")
            .update({ uretici_lat: coords.lat, uretici_lng: coords.lon })
            .eq("id", id);
          if (error) {
            console.warn(`  ! id=${id} guncellenemedi: ${error.message}`);
          }
        }
      } else {
        unresolvedUretici.push({ adres: address, ids });
      }
    } catch (err) {
      console.warn(`  ! uretici adresi geocode hatasi: ${err.message}`);
      unresolvedUretici.push({ adres: address, ids });
    }

    console.log(
      `${i + 1}/${producerAddresses.length} uretici adresi tamamlandi (${ids.length} satira uygulandi)`
    );
  }

  console.log("\n== Ozet ==");
  console.log(`Bulunamayan bayi adresleri: ${unresolvedBayi.length}`);
  for (const u of unresolvedBayi) {
    console.log(`  - id=${u.id}: ${u.adres}`);
  }
  console.log(`Bulunamayan uretici adresleri: ${unresolvedUretici.length}`);
  for (const u of unresolvedUretici) {
    console.log(`  - ${u.adres} (${u.ids.length} satir etkilendi)`);
  }

  console.log("\nTamamlandi.");
}

main().catch((err) => {
  console.error("Script hata ile durdu:", err);
  process.exit(1);
});
