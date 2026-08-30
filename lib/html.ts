/**
 * Escape a string for safe interpolation into an HTML document (text content or
 * a double/single-quoted attribute value). Used for the transactional-email
 * bodies we build by hand (contact route, Supabase webhooks) — the values there
 * are low-trust (a visitor-supplied address, a DB column) and must never be able
 * to inject markup into the message an admin opens.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
