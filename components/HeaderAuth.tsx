"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Right-side auth control in the header: log in / sign up, or signed-in email + sign out. */
export default function HeaderAuth() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setEmail(null);
    router.refresh();
  }

  if (!ready) return <div className="h-7 w-24" />;

  if (!email) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Log In
        </Link>
        <Link
          href="/login"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/settings"
        className="hidden max-w-[180px] truncate text-xs text-slate-500 transition-colors hover:text-slate-900 sm:inline"
        title={`${email} — Settings`}
      >
        {email}
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  );
}
