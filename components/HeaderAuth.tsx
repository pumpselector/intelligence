"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Right-side auth control in the header: log in / sign up, or signed-in email + account dropdown. */
export default function HeaderAuth() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-900"
        title={email}
      >
        <span className="max-w-[120px] truncate sm:max-w-[180px]">{email}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-50"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
