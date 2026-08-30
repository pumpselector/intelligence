import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { USER_HEADER, decodeUserHeader, type ProxyUser } from "@/lib/session-header";

/**
 * 0  - visitor, no session
 * 1  - signed in (email may or may not be confirmed), not yet admin-approved
 * 2  - approved, not subscribed
 * 3  - approved + paid -> full access
 *
 * Levels 0/1/2 share the same restricted (masked) view; only the banner differs.
 * `emailVerified` splits level 1 into "confirm your email" vs "pending approval".
 */
export type AccessLevel = 0 | 1 | 2 | 3;

export type Access = {
  level: AccessLevel;
  userId: string | null;
  email: string | null;
  emailVerified: boolean;
};

export function hasFullAccess(level: AccessLevel): boolean {
  return level === 3;
}

/**
 * Resolves the current request's access level from the Supabase session +
 * profile.
 *
 * The proxy has already validated the auth token for this request and passed
 * the user down via {@link USER_HEADER}, so we read that instead of paying for
 * a second `auth.getUser()` network round trip. If the header is missing (a
 * route outside the proxy matcher, say) we fall back to `getUser()`.
 */
export async function getAccess(): Promise<Access> {
  const supabase = await createClient();

  let user: ProxyUser | null = decodeUserHeader((await headers()).get(USER_HEADER));

  if (!user) {
    const {
      data: { user: fetched },
    } = await supabase.auth.getUser();
    user = fetched
      ? {
          id: fetched.id,
          email: fetched.email ?? null,
          emailConfirmedAt: fetched.email_confirmed_at ?? null,
        }
      : null;
  }

  if (!user) return { level: 0, userId: null, email: null, emailVerified: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, paid, access_until, deletion_requested")
    .eq("id", user.id)
    .single();

  // Deletion requested -> locked out. Treat exactly like a signed-out visitor
  // everywhere (protected pages redirect to /login; public pages show the
  // masked view). Login itself is also blocked in app/login.
  if (profile?.deletion_requested) {
    return { level: 0, userId: null, email: null, emailVerified: false };
  }

  const base = {
    userId: user.id,
    email: user.email,
    // Authoritative and migration-independent. profiles.email_verified mirrors
    // this (via trigger, migration 0003) for admin/DB-side queries.
    emailVerified: Boolean(user.emailConfirmedAt),
  };

  // access_until is set only when a subscription is cancelled "at period end"
  // (migration 0013): paid stays true, but full access lapses once the paid
  // period is over. Null = no expiry.
  const today = new Date().toISOString().slice(0, 10);
  const paidActive =
    Boolean(profile?.paid) && (!profile?.access_until || profile.access_until >= today);

  if (!profile?.approved) return { level: 1, ...base };
  if (!paidActive) return { level: 2, ...base };
  return { level: 3, ...base };
}
