import { createClient } from "@/lib/supabase/server";

/**
 * 0 - visitor, no session
 * 1 - signed in, not yet approved
 * 2 - approved, not subscribed
 * 3 - approved + paid -> full access
 *
 * Levels 0/1/2 share the same restricted (masked) view; only the banner differs.
 */
export type AccessLevel = 0 | 1 | 2 | 3;

export type Access = {
  level: AccessLevel;
  email: string | null;
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

  if (!user) return { level: 0, email: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, paid")
    .eq("id", user.id)
    .single();

  const email = user.email ?? null;

  if (!profile?.approved) return { level: 1, email };
  if (!profile.paid) return { level: 2, email };
  return { level: 3, email };
}
