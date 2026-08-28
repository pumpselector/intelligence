"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { borderClass, INPUT_BASE, isPasswordValid } from "@/lib/password";
import PasswordFields from "@/components/PasswordFields";

type Status = { type: "error" | "info"; text: string } | null;

export default function ChangePasswordSection({ email }: { email: string | null }) {
  const [supabase] = useState(() => createClient());
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const ready = isPasswordValid(password) && confirmPassword.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setPending(true);
    setStatus(null);

    // Optional extra check: if the user typed their current password, verify it
    // before changing. Supabase's updateUser works on the session alone, so an
    // empty field just skips this step.
    if (currentPassword && email) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        setStatus({ type: "error", text: "Current password is incorrect." });
        setPending(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password });

    setPending(false);
    if (error) {
      setStatus({ type: "error", text: error.message });
      return;
    }

    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setStatus({ type: "info", text: "Password updated." });
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Change password</h2>

      <form onSubmit={handleSubmit} className="mt-4 flex max-w-sm flex-col gap-3">
        <div>
          <label
            htmlFor="cp-current"
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Current password <span className="normal-case text-slate-400">(optional)</span>
          </label>
          <input
            id="cp-current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={`${INPUT_BASE} ${borderClass("neutral")}`}
          />
        </div>

        <PasswordFields
          idPrefix="cp"
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirmPassword}
        />

        {status && (
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              status.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {status.text}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !ready}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
