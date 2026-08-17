// Cleans up dealers.bayi_adres for rows that could not be geocoded yet
// (bayi_lat IS NULL) — strips embedded websites, phone numbers and
// tax/registration codes out of the address text, and tries to repair
// mangled UTF-8 (mojibake). Extracted websites/phones are only written
// back if the corresponding column is currently empty.
//
// Three modes:
//   node scripts/clean-addresses.mjs                  dry-run: prints
//     "ESKİ / YENİ" for every row, writes nothing, and generates
//     scripts/address-review.csv for manual review (fill in the "onay"
//     column with "evet" for rows to apply).
//   node scripts/clean-addresses.mjs --apply           applies the cleaned
//     result for every changed row directly (no manual review step).
//   node scripts/clean-addresses.mjs --apply-from-csv   reads back
//     scripts/address-review.csv and applies only the rows where "onay"
//     is exactly "evet". Takes priority if both flags are passed.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.geocode (same as geocode.mjs).

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const CSV_PATH = path.join(__dirname, "address-review.csv");

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

const APPLY_FROM_CSV = process.argv.includes("--apply-from-csv");
const APPLY = !APPLY_FROM_CSV && process.argv.includes("--apply");
const PAGE_SIZE = 1000;

/** Treats null/empty/placeholder ("." or "-") values as missing. */
function hasValue(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  return trimmed !== "" && trimmed !== "." && trimmed !== "-";
}

// --- d) encoding repair -----------------------------------------------
// Classic symptom of UTF-8 bytes re-interpreted as Latin-1: "Ã¡", "Â",
// "â€™" etc. Only attempt a fix when that pattern shows up, and only keep
// the fix if it actually resolves the mojibake without introducing
// replacement characters.
const MOJIBAKE_HINT = /Ã.|Â.|â€™|â€œ|â€\x9d|â€"/;

function fixEncoding(text) {
  if (!text || !MOJIBAKE_HINT.test(text)) return text;
  try {
    const fixed = Buffer.from(text, "latin1").toString("utf8");
    if (fixed.includes("�")) return text;
    if (MOJIBAKE_HINT.test(fixed)) return text;
    return fixed;
  } catch {
    return text;
  }
}

// --- a) website extraction ----------------------------------------------
const WWW_REGEX = /\bwww\.[^\s,;]+/gi;
const TLD_REGEX = /\b[a-zA-Z0-9][a-zA-Z0-9.-]*\.(?:com|co|net|org|biz|info|nf\.ca)\b/gi;

function extractWebsite(text) {
  let website = null;
  let result = text;

  const wwwMatches = result.match(WWW_REGEX);
  if (wwwMatches && wwwMatches.length > 0) {
    website = wwwMatches[0];
    result = result.replace(WWW_REGEX, " ");
  }

  const tldMatches = result.match(TLD_REGEX);
  if (tldMatches && tldMatches.length > 0) {
    if (!website) website = tldMatches[0];
    result = result.replace(TLD_REGEX, " ");
  }

  return { text: result, website };
}

// --- b) phone extraction -------------------------------------------------
// Minimum 7 middle chars (9 total) rather than 6/8 so 5-7 digit postal
// codes ("222-0033") don't get misread as phone numbers. Leading "(" and
// "+" are each independently optional, and a trailing ")" is optional too,
// so "(+45) 32 52 71 00" is captured whole instead of splitting off the
// opening paren.
const PHONE_REGEX = /\(?\+?\d[\d\s\-()]{7,}\d\)?/g;

function extractPhone(text) {
  const matches = text.match(PHONE_REGEX);
  if (!matches || matches.length === 0) return { text, phone: null };
  const phone = matches[0].trim();
  const cleaned = text.replace(PHONE_REGEX, " ");
  return { text: cleaned, phone };
}

// --- c) tax / registration code removal ----------------------------------
// Matches "<label><separator><code>" anywhere in the text and removes the
// whole thing — label AND code together, never just the code — so no
// dangling "TAX ID:" / "VAT:" leftover can survive. The separator branch
// requires an actual colon/period or whitespace (never zero-width), which
// is what stops "VAT" from matching inside an unrelated word like
// "Vattenfall": after literal "VAT" the next char there is "t", which
// satisfies neither branch, so the alternation fails to match.
// Runs before the generic phone regex so a numeric VAT/IČ/TAX ID code can
// never be misread as a phone number.
const TAX_LABEL_REGEX =
  /\b(?:TAX\s*ID|I[ČC]|DI[ČC]|VAT|Reg\.?\s*No\.?|Mobil)(?:\s*[:.]\s*|\s+)[A-Za-z0-9+][A-Za-z0-9+\-/]*/gi;

function splitTrimmed(text) {
  return text
    .split(",")
    .map((seg) => seg.replace(/\s+/g, " ").trim())
    // Drop empty segments and pure-punctuation leftovers (stray "(", "'",
    // a lone undecodable "Â", etc.) from regex removals above.
    .filter((seg) => seg.length > 0 && /[a-zA-Z0-9]/.test(seg));
}

// --- full pipeline ---------------------------------------------------------
function cleanAddress(rawAddress) {
  let text = fixEncoding(rawAddress);

  const website = extractWebsite(text);
  text = website.text;

  text = text.replace(TAX_LABEL_REGEX, " ");

  const phone = extractPhone(text);
  text = phone.text;

  const segments = splitTrimmed(text);
  text = segments.join(", ");

  return { address: text, website: website.website, phone: phone.phone };
}

async function fetchUngeocodedDealers() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dealers")
      .select("id,bayi_adi,bayi_adres,bayi_telefon,bayi_web")
      .is("bayi_lat", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Dealers cekilemedi: ${error.message}`);

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

// --- CSV export (dry-run) ---------------------------------------------------
const CSV_HEADER = [
  "id",
  "bayi_adi",
  "eski_adres",
  "yeni_adres",
  "cikan_telefon",
  "mevcut_telefon",
  "cikan_website",
  "mevcut_website",
  "final_adres",
  "final_telefon",
  "final_website",
  "onay",
];

/** Empty for the CSV workflow means literally blank/null — not the broader
 * "." / "-" placeholder heuristic hasValue() uses elsewhere. */
function isEmptyCell(value) {
  return (value ?? "").toString().trim() === "";
}

function toNullIfEmpty(value) {
  return isEmptyCell(value) ? null : value;
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsvReport(csvRows) {
  const lines = [CSV_HEADER.join(",")];
  for (const row of csvRows) {
    // final_* are the values --apply-from-csv will actually write: default
    // to the cleaned address, and to whichever of mevcut_*/cikan_* is
    // non-empty (existing value wins, otherwise the newly extracted one).
    // The reviewer can hand-edit these cells directly before approving.
    const finalAdres = row.yeni_adres;
    const finalTelefon = isEmptyCell(row.mevcut_telefon) ? row.cikan_telefon ?? "" : row.mevcut_telefon;
    const finalWebsite = isEmptyCell(row.mevcut_website) ? row.cikan_website ?? "" : row.mevcut_website;

    lines.push(
      [
        row.id,
        row.bayi_adi ?? "",
        row.eski_adres,
        row.yeni_adres,
        row.cikan_telefon ?? "",
        row.mevcut_telefon ?? "",
        row.cikan_website ?? "",
        row.mevcut_website ?? "",
        finalAdres,
        finalTelefon,
        finalWebsite,
        "", // onay — left blank for manual review in Excel
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  // UTF-8 BOM so Excel opens Turkish characters correctly.
  writeFileSync(CSV_PATH, "﻿" + lines.join("\r\n") + "\r\n", "utf8");
}

// --- CSV import (--apply-from-csv) ------------------------------------------
// Turkish-locale Excel saves "CSV" with ";" as the field separator instead
// of ",". Detect which one the file actually uses from the header line
// (whichever character shows up more often) instead of assuming ",".
function detectDelimiter(content) {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const newlineIndex = text.indexOf("\n");
  const headerLine = newlineIndex === -1 ? text : text.slice(0, newlineIndex);
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsv(content, delimiter) {
  const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // ignore, handled by \n
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function applyFromCsv() {
  if (!existsSync(CSV_PATH)) {
    console.error(`CSV bulunamadi: ${CSV_PATH}. Once dry-run calistirip dosyayi olusturun.`);
    process.exit(1);
  }

  const content = readFileSync(CSV_PATH, "utf8");
  const delimiter = detectDelimiter(content);
  console.log(`CSV ayraci tespit edildi: "${delimiter}"\n`);
  const rows = parseCsv(content, delimiter).filter((r) => r.length > 1 || (r.length === 1 && hasValue(r[0])));

  if (rows.length === 0) {
    console.log("CSV bos, uygulanacak satir yok.");
    return;
  }

  const header = rows[0];
  const col = (name) => header.indexOf(name);
  const iId = col("id");
  const iFinalAdres = col("final_adres");
  const iFinalTelefon = col("final_telefon");
  const iFinalWebsite = col("final_website");
  const iOnay = col("onay");

  if ([iId, iFinalAdres, iOnay].some((i) => i === -1)) {
    console.error("CSV basliklari beklenen formatta degil (en az id, final_adres, onay kolonlari gerekli).");
    process.exit(1);
  }

  const dataRows = rows.slice(1).filter((r) => hasValue(r[iId]));
  console.log(`CSV okundu: ${dataRows.length} satir.\n`);

  let appliedCount = 0;
  let skippedCount = 0;

  for (const row of dataRows) {
    const id = row[iId];
    const onay = (row[iOnay] ?? "").trim().toLowerCase();

    if (onay !== "evet") {
      skippedCount++;
      continue;
    }

    const updatePayload = {
      bayi_adres: row[iFinalAdres] ?? "",
      bayi_telefon: toNullIfEmpty(row[iFinalTelefon]),
      bayi_web: toNullIfEmpty(row[iFinalWebsite]),
    };

    const { error } = await supabase.from("dealers").update(updatePayload).eq("id", id);
    if (error) {
      console.warn(`  ! id=${id} guncellenemedi: ${error.message}`);
    } else {
      appliedCount++;
      console.log(`#${id} uygulandi.`);
    }
  }

  console.log("\n== Ozet ==");
  console.log(`Onayli (evet) ve uygulanan: ${appliedCount}`);
  console.log(`Atlanan (onay 'evet' degil): ${skippedCount}`);
}

// --- dry-run / --apply -------------------------------------------------------
async function runClean() {
  console.log(APPLY ? "MOD: --apply (Supabase guncellenecek)\n" : "MOD: dry-run (onizleme + CSV raporu, hicbir sey yazilmayacak)\n");

  const rows = await fetchUngeocodedDealers();
  console.log(`bayi_lat IS NULL olan ${rows.length} satir bulundu.\n`);

  let changedCount = 0;
  let skippedEmpty = 0;
  const csvRows = [];

  for (const row of rows) {
    if (!hasValue(row.bayi_adres)) {
      skippedEmpty++;
      continue;
    }

    const original = row.bayi_adres;
    const { address: cleaned, website, phone } = cleanAddress(original);

    const telefonDoluMu = hasValue(row.bayi_telefon);
    const webDoluMu = hasValue(row.bayi_web);
    const willSetWeb = Boolean(website) && !webDoluMu;
    const willSetPhone = Boolean(phone) && !telefonDoluMu;
    const addressChanged = cleaned !== original.trim();
    const changed = addressChanged || willSetWeb || willSetPhone;

    if (changed) changedCount++;

    const extras = [
      willSetWeb ? `web: ${website}` : null,
      willSetPhone ? `tel: ${phone}` : null,
    ].filter(Boolean);
    const extrasText = extras.length > 0 ? ` (${extras.join(", ")})` : "";

    console.log(`#${row.id} ESKİ: "${original}" | YENİ: "${cleaned}"${extrasText}`);

    if (changed) {
      csvRows.push({
        id: row.id,
        bayi_adi: row.bayi_adi,
        eski_adres: original,
        yeni_adres: cleaned,
        cikan_telefon: phone ?? "",
        mevcut_telefon: row.bayi_telefon ?? "",
        cikan_website: website ?? "",
        mevcut_website: row.bayi_web ?? "",
      });
    }

    if (APPLY && changed) {
      const updatePayload = { bayi_adres: cleaned };
      if (willSetWeb) updatePayload.bayi_web = website;
      if (willSetPhone) updatePayload.bayi_telefon = phone;

      const { error } = await supabase.from("dealers").update(updatePayload).eq("id", row.id);
      if (error) {
        console.warn(`  ! id=${row.id} guncellenemedi: ${error.message}`);
      }
    }
  }

  if (!APPLY) {
    writeCsvReport(csvRows);
    console.log(`\nCSV raporu yazildi: ${CSV_PATH} (${csvRows.length} satir)`);
  }

  console.log("\n== Ozet ==");
  console.log(`Toplam satir: ${rows.length}`);
  console.log(`Bos adres oldugu icin atlanan: ${skippedEmpty}`);
  console.log(`Degisiklik onerilen: ${changedCount}`);
  console.log(
    APPLY
      ? "Uygulandi: Supabase guncellendi."
      : "Dry-run: hicbir sey yazilmadi. address-review.csv'yi duzenleyip --apply-from-csv ile uygulayabilirsiniz (veya direkt --apply)."
  );
}

async function main() {
  if (APPLY_FROM_CSV) {
    await applyFromCsv();
  } else {
    await runClean();
  }
}

main().catch((err) => {
  console.error("Script hata ile durdu:", err);
  process.exit(1);
});
