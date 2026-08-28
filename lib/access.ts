import { createClient } from "@/lib/supabase/server";

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
  email: string | null;
  emailVerified: boolean;
};

export function hasFullAccess(level: AccessLevel): boolean {
  return level === 3;
}

/** Resolves the current request's access level from the Supabase session + profile. */
export async function getAccess(): Promise<Access> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { level: 0, email: null, emailVerified: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, paid")
    .eq("id", user.id)
    .single();

  const email = user.email ?? null;
  // Authoritative and migration-independent. profiles.email_verified mirrors this
  // (via trigger, migration 0003) for admin/DB-side queries.
  const emailVerified = Boolean(user.email_confirmed_at);

  if (!profile?.approved) return { level: 1, email, emailVerified };
  if (!profile.paid) return { level: 2, email, emailVerified };
  return { level: 3, email, emailVerified };
}
