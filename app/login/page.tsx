"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Status = { type: "error" | "info"; text: string } | null;

// At least 8 characters, with one letter and one number.
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_HINT = "At least 8 characters, with one letter and one number";

const NOTICES: Record<string, string> = {
  confirmed: "Email confirmed. You can sign in once an administrator approves your access.",
  link_used:
    "That confirmation link was already opened — some email apps preview links automatically. If your email is confirmed, just sign in below. Otherwise request a new confirmation email.",
  link_expired:
    "This confirmation link is no longer valid. Try signing in — if your email isn't confirmed yet, request a new confirmation email below.",
};

const INPUT_BASE =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition-colors";

function borderClass(state: "neutral" | "ok" | "bad"): string {
  if (state === "ok") return "border-emerald-400 focus:border-emerald-500";
  if (state === "bad") return "border-red-400 focus:border-red-500";
  return "border-slate-300 focus:border-slate-400";
}

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

  const passwordValid = PASSWORD_RE.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const signupReady = passwordValid && passwordsMatch;

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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus({ type: "error", text: error.message });
      if (/confirm/i.test(error.message)) setShowResend(true);
      setPending(false);
      return;
    }

    const user = data.user;
    const { data: profile } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", user.id)
      .single();

    if (!profile?.approved) {
      await supabase.auth.signOut();
      setStatus({
        type: "info",
        text: "Your account is pending admin approval. You'll be able to sign in once it's approved.",
      });
      setPending(false);
      return;
    }

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

  const isSignup = mode === "signup";
  const passwordState: "neutral" | "ok" | "bad" = !isSignup || password.length === 0
    ? "neutral"
    : passwordValid
      ? "ok"
      : "bad";
  const confirmState: "neutral" | "ok" | "bad" =
    confirmPassword.length === 0 ? "neutral" : passwordsMatch ? "ok" : "bad";

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

          <div>
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={isSignup ? 8 : 6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT_BASE} ${borderClass(passwordState)}`}
            />
            {isSignup && (
              <p
                className={`mt-1 text-xs ${
                  passwordState === "bad" ? "text-red-600" : "text-slate-400"
                }`}
              >
                {PASSWORD_HINT}
              </p>
            )}
          </div>

          {isSignup && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${INPUT_BASE} ${borderClass(confirmState)}`}
              />
              {confirmState === "bad" && (
                <p className="mt-1 text-xs text-red-600">Passwords don&apos;t match.</p>
              )}
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
