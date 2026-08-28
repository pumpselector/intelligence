/**
 * Count formatting used across the app. Locale is pinned to en-US so a number
 * renders identically whether it's produced on the server (RSC) or the client:
 * "5,559", never "5.559".
 */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
