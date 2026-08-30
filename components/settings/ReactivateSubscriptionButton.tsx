"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Reactivate subscription" — the undo for a cancel. Calls
 * /api/paypal/reactivate-subscription, which un-suspends the PayPal
 * subscription and restores full access + the block list.
 */
export default function ReactivateSubscriptionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function reactivate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/paypal/reactivate-subscription", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
      if (!res.ok) {
        setError(data.hint || data.error || "Could not reactivate your subscription.");
        setBusy(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Could not reach the billing service.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        Your subscription is active again.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={reactivate}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Reactivating…" : "Changed your mind? Reactivate subscription"}
      </button>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
