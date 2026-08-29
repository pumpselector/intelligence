"use client";

import { useState } from "react";

/**
 * Sends the buyer to PayPal to re-consent to a queued price increase. Re-issues
 * the /revise call first so the approval link is always fresh (PayPal's tokens
 * expire), falling back to the last stored link if that call can't be reached.
 */
export default function ApproveRevisionButton({ fallbackUrl }: { fallbackUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/paypal/revise-subscription", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { approvalUrl?: string | null };
      window.location.assign(data.approvalUrl || fallbackUrl);
    } catch {
      setBusy(false);
      setError("Couldn't reach PayPal. Please try again in a moment.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
      >
        {busy ? "Opening PayPal…" : "Approve the new amount on PayPal →"}
      </button>
      {error && <p className="mt-1 text-red-600">{error}</p>}
    </>
  );
}
