import { dealerKey, producerKey, type Dealer } from "@/lib/dealers";
import type { DistributorNews } from "@/lib/news";

/**
 * Replaces a real value with a block string of roughly the same length.
 * Length is only approximate on purpose — it must not be reversible.
 * Runs on the server; masked rows are what gets serialized to the client,
 * so the real values never leave the server for restricted users.
 */
export function maskValue(value: string | null): string | null {
  if (value == null) return value;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "." || trimmed === "-") return value;
  const len = Math.min(Math.max(trimmed.length, 4), 16);
  return "█".repeat(len);
}

// Non-cryptographic one-way token: enough to make the masked identity keys
// opaque (client can't read the name back) while staying stable per value so
// unique counts are exact. Salted so it isn't a plain dictionary lookup.
const KEY_SALT = "pumpradar24::mask::v1";

function fnv1a(input: string, basis: number): number {
  let h = basis;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ~64-bit token (two independent FNV-1a passes) so distinct producers/dealers
// almost never collide — the unique counts derived from these must be exact.
function hashKey(normalized: string | null): string | null {
  if (!normalized) return null;
  const input = `${KEY_SALT}:${normalized}`;
  return fnv1a(input, 0x811c9dc5).toString(36) + "-" + fnv1a(input, 0x9e3779b1).toString(36);
}

/** Fields that reveal manufacturer or dealer identity — masked for levels 0/1/2. */
const MASKED_DEALER_FIELDS: (keyof Dealer)[] = [
  "uretici",
  "uretici_adres",
  "bayi_adi",
  "bayi_adres",
  "bayi_telefon",
  "bayi_email",
  "bayi_web",
];

export function maskDealer(dealer: Dealer): Dealer {
  const masked = { ...dealer };
  for (const field of MASKED_DEALER_FIELDS) {
    masked[field] = maskValue(dealer[field] as string | null) as never;
  }
  // Attach opaque identity tokens BEFORE the real names are gone from scope,
  // so the client can still count distinct producers / dealers accurately.
  masked.uretici_key = hashKey(producerKey(dealer));
  masked.bayi_key = hashKey(dealerKey(dealer));
  return masked;
}

const MASKED_NEWS_FIELDS: (keyof DistributorNews)[] = [
  "uretici",
  "bayi_adi",
  "bayi_adres",
  "bayi_telefon",
  "bayi_email",
  "bayi_web",
];

export function maskNews(item: DistributorNews): DistributorNews {
  const masked = { ...item };
  for (const field of MASKED_NEWS_FIELDS) {
    masked[field] = maskValue(item[field] as string | null) as never;
  }
  return masked;
}

/**
 * Soft, home-page-preview-only name mask: keep the first word verbatim, then
 * append "****". Multi-letter first word → no gap ("AG INDUSTRIES" → "AG****");
 * single-letter first word → one space ("A Pumps" → "A ****"). This is a teaser
 * for the public landing page, NOT an access boundary — {@link maskValue} (full
 * █ blocks) still guards the real /news and /intelligence pages.
 */
export function maskCompanyNamePreview(value: string | null): string | null {
  if (value == null) return value;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "." || trimmed === "-") return value;
  const first = trimmed.split(/\s+/)[0];
  return first.length >= 2 ? `${first}****` : `${first} ****`;
}

/**
 * Shapes a news row for the home-page preview cards: producer + dealer names get
 * the soft {@link maskCompanyNamePreview} treatment; pump type and every dealer
 * contact field are dropped so the preview only ever shows change type, date,
 * masked producer, masked dealer and country.
 */
export function maskNewsPreview(item: DistributorNews): DistributorNews {
  return {
    ...item,
    uretici: maskCompanyNamePreview(item.uretici),
    bayi_adi: maskCompanyNamePreview(item.bayi_adi),
    pump: null,
    bayi_adres: null,
    bayi_telefon: null,
    bayi_email: null,
    bayi_web: null,
  };
}
