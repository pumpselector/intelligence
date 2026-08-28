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

const MASKED_NEWS_FIELDS: (keyof DistributorNews)[] = ["uretici", "bayi_adi", "detay"];

export function maskNews(item: DistributorNews): DistributorNews {
  const masked = { ...item };
  for (const field of MASKED_NEWS_FIELDS) {
    masked[field] = maskValue(item[field] as string | null) as never;
  }
  return masked;
}
