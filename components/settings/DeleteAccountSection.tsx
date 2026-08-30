"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * "Danger Zone" — request account deletion. Nothing is deleted immediately; the
 * account is flagged (server) and the user is locked out. An admin does the
 * real removal by hand.
 */
export default function DeleteAccountSection() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestDeletion() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete-request", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Could not process your request. Please try again.");
        setBusy(false);
        return;
      }
      // The server already signed us out; clear the local session too and leave.
      await supabase.auth.signOut().catch(() => {});
      router.push("/login?notice=account_deactivated");
    } catch {
      setError("Could not reach the server. Please try again.");
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-red-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-600">Danger zone</h2>
      <p className="mt-2 text-sm text-slate-600">
        Requesting deletion deactivates your account immediately and signs you out. Our team then
        removes your data. This cannot be undone from here.
      </p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            Are you sure? This will deactivate your account.
          </p>
          {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={requestDeletion}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Processing…" : "Yes, delete my account"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white disabled:opacity-50"
            >
              Keep my account
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
