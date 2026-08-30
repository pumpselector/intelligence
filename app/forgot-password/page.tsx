"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { borderClass, INPUT_BASE } from "@/lib/password";

// Identical message whether or not the email is registered — never reveal which
// addresses have accounts (email-enumeration protection).
const GENERIC_RESULT =
  "If an account exists with this email, we've sent a password reset link. It expires after a short while, so use it soon.";

export default function ForgotPasswordPage() {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    // Fire and forget: we show the same confirmation regardless of the result
    // (an unknown address, a rate-limit, a transient error) so nothing leaks.
    await supabase.auth
      .resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      .catch(() => {});
    setPending(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Reset your password</h1>

        {sent ? (
          <>
            <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700">{GENERIC_RESULT}</p>
            <Link
              href="/login"
              className="mt-4 inline-flex w-full justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-500">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${INPUT_BASE} ${borderClass("neutral")}`}
                />
              </div>
              <button
                type="submit"
                disabled={pending || email.trim().length === 0}
                className="mt-1 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <Link
              href="/login"
              className="mt-3 block text-center text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
