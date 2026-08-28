"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Status = { type: "error" | "info"; text: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedInEmail(data.user?.email ?? null);
      setCheckingSession(false);
    });
  }, [supabase]);

  function switchMode(next: Mode) {
    setMode(next);
    setStatus(null);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus({ type: "error", text: error.message });
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
        text: "Your account is pending approval. You'll be able to sign in once an administrator approves it.",
      });
      setPending(false);
      return;
    }

    router.push("/intelligence");
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus({ type: "error", text: error.message });
      setPending(false);
      return;
    }

    setStatus({
      type: "info",
      text: "Account created. Check your email to confirm it, then wait for an administrator to approve your access before signing in.",
    });
    setPending(false);
    setPassword("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSignedInEmail(null);
  }

  if (checkingSession) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (signedInEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="mt-1 text-base font-medium text-slate-900">{signedInEmail}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-5 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    );
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

        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
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
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>

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
            disabled={pending}
            className="mt-1 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
