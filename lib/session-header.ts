import type { User } from "@supabase/supabase-js";

/**
 * Request header the proxy uses to hand the just-validated Supabase user to
 * server components, so `getAccess()` doesn't have to call `auth.getUser()` a
 * second time in the same request. Only the proxy may set it — it strips any
 * inbound value first (see proxy.ts).
 *
 * This module is import-safe from the proxy runtime: no `next/headers`, no
 * server-only code.
 */
export const USER_HEADER = "x-pr24-user";

export type ProxyUser = {
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
};

export function encodeUserHeader(user: User): string {
  const payload: ProxyUser = {
    id: user.id,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  };
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeUserHeader(raw: string | null | undefined): ProxyUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ProxyUser>;
    if (!parsed || typeof parsed.id !== "string") return null;
    return {
      id: parsed.id,
      email: typeof parsed.email === "string" ? parsed.email : null,
      emailConfirmedAt:
        typeof parsed.emailConfirmedAt === "string" ? parsed.emailConfirmedAt : null,
    };
  } catch {
    return null;
  }
}
