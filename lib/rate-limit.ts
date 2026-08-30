/**
 * Tiny in-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free: no Redis / KV. On serverless this state lives
 * only for the lifetime of a warm lambda instance and is not shared between
 * instances, so it is a *deterrent*, not a hard guarantee — enough to blunt a
 * naive flood from a single IP against an unauthenticated endpoint
 * (/api/contact). Swap in a shared store here if a real guarantee is needed.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
let lastSweep = 0;

/** Drop expired entries occasionally so the map can't grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000 && windows.size < 5_000) return;
  lastSweep = now;
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

/**
 * Records one hit for `key` and reports whether it is within `limit` hits per
 * `windowMs`. The window is fixed (resets `windowMs` after the first hit), which
 * is fine for coarse abuse protection.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from the platform's forwarding headers. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
