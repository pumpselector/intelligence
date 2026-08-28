import type { Dealer } from "@/lib/dealers";
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
