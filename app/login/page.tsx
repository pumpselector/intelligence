"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { borderClass, INPUT_BASE, isPasswordValid } from "@/lib/password";
import PasswordFields from "@/components/PasswordFields";

type Mode = "signin" | "signup";
type Status = { type: "error" | "info"; text: string } | null;

const NOTICES: Record<string, string> = {
  confirmed:
    "Email confirmed — you can sign in now. An administrator will review your account for full data access.",
  password_updated: "Password updated. Please sign in with your new password.",
  link_used:
    "That confirmation link was already opened — some email apps preview links automatically. If your email is confirmed, just sign in below. Otherwise request a new confirmation email.",
  link_expired:
    "This confirmation link is no longer valid. Try signing in — if your email isn't confirmed yet, request a new confirmation email below.",
};

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noticeKey = params.get("confirmed") ? "confirmed" : params.get("notice") ?? "";
    if (NOTICES[noticeKey]) {
      setStatus({ type: "info", text: NOTICES[noticeKey] });
      if (noticeKey === "link_used" || noticeKey === "link_expired") setShowResend(true);
      // Drop the query string so a refresh doesn't keep re-showing the notice.
      window.history.replaceState(null, "", window.location.pathname);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        // Already signed in (e.g. just came back from the email-confirm link).
        // Send them to the app so AccessBanner can show their real status.
        router.replace("/intelligence");
        return;
      }
      setCheckingSession(false);
    });
  }, [supabase, router]);

  const isSignup = mode === "signup";
  const signupReady =
    isPasswordValid(password) && confirmPassword.length > 0 && password === confirmPassword;

  function switchMode(next: Mode) {
    setMode(next);
    setStatus(null);
    setShowResend(false);
    setConfirmPassword("");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus({ type: "error", text: error.message });
      if (/confirm/i.test(error.message)) setShowResend(true);
      setPending(false);
      return;
    }

    // A confirmed email is all that's needed to sign in. Admin approval only
    // gates *content* (handled by the proxy / access level + the banner), it is
    // NOT a login gate — so no approved check here.
    router.push("/intelligence");
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!signupReady) return;
    setPending(true);
    setStatus(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus({ type: "error", text: error.message });
      setPending(false);
      return;
    }

    router.push(`/signup/check-email?email=${encodeURIComponent(email)}`);
  }

  async function handleResend() {
    if (!email) {
      setStatus({ type: "error", text: "Enter your email address above first." });
      return;
    }
    setResending(true);
    setStatus(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setResending(false);
    setStatus(
      error
        ? { type: "error", text: error.message }
        : { type: "info", text: `New confirmation link sent to ${email}.` }
    );
  }

  if (checkingSession) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={isSignup ? handleSignUp : handleSignIn} className="flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${INPUT_BASE} ${borderClass("neutral")}`}
            />
          </div>

          {isSignup ? (
            <PasswordFields
              idPrefix="signup"
              newLabel="Password"
              confirmLabel="Confirm password"
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirmPassword}
            />
          ) : (
            <div>
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_BASE} ${borderClass("neutral")}`}
              />
              <div className="mt-1 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          )}

          {status && (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                status.type === "error" ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-700"
              }`}
            >
              {status.text}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || (isSignup && !signupReady)}
            className="mt-1 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait…" : isSignup ? "Create account" : "Sign In"}
          </button>
        </form>

        {showResend && !isSignup && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-3 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
        )}
      </div>
    </div>
  );
}
