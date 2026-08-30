"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPasswordValid } from "@/lib/password";
import PasswordFields from "@/components/PasswordFields";

type Phase = "checking" | "form" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hadError = new URLSearchParams(window.location.search).has("error");
    // /auth/reset exchanged the recovery code for a session before redirecting
    // here — so a valid session (and no ?error) means the link was good.
    supabase.auth.getUser().then(({ data }) => {
      setPhase(!hadError && data.user ? "form" : "invalid");
    });
  }, [supabase]);

  const ready =
    isPasswordValid(password) && confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setPending(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    // Force a clean sign-in with the new password (also stops the /login page
    // from bouncing an existing session straight to /intelligence).
    await supabase.auth.signOut();
    router.push("/login?notice=password_updated");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Set a new password</h1>

        {phase === "checking" && (
          <p className="mt-3 text-sm text-slate-500">Checking your reset link…</p>
        )}

        {phase === "invalid" && (
          <>
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              This password reset link is invalid or has expired. Request a new one to continue.
            </p>
            <Link
              href="/forgot-password"
              className="mt-4 inline-flex w-full justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Request a new link
            </Link>
          </>
        )}

        {phase === "form" && (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <PasswordFields
              idPrefix="reset"
              newLabel="New password"
              confirmLabel="Confirm new password"
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirmPassword}
            />

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending || !ready}
              className="mt-1 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
