export const BASE_PRICE = 59.99;
export const PER_BLOCK_PRICE = 49.99;

export type PlanType = "standard" | "blocking";

/** Monthly total for a blocking plan with `blockCount` competitors, rounded to cents. */
export function blockingPrice(blockCount: number): number {
  return Math.round((BASE_PRICE + blockCount * PER_BLOCK_PRICE) * 100) / 100;
}

/** "59,99 €" — comma decimal, trailing euro sign, always 2 dp. */
export function formatEur(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} €`;
}
