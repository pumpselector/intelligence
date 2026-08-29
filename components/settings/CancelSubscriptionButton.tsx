"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso)
  );
}

/**
 * "Cancel subscription" control. Calls /api/paypal/cancel-subscription, which
 * cancels at PayPal immediately but leaves full access in place until the end
 * of the paid period (profiles.access_until).
 */
export default function CancelSubscriptionButton({
  nextPaymentDate,
}: {
  nextPaymentDate: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/paypal/cancel-subscription", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { accessUntil?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not cancel your subscription.");
        setBusy(false);
        return;
      }
      setDone(data.accessUntil ?? nextPaymentDate ?? null);
      router.refresh();
    } catch {
      setError("Could not reach the billing service.");
      setBusy(false);
    }
  }

  if (done !== null) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Your subscription is cancelled. Full access continues until{" "}
        {done ? formatDate(done) : "the end of your period"}.
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-xs text-red-700">
        Cancel your subscription? You&apos;ll keep full access until{" "}
        {nextPaymentDate ? formatDate(nextPaymentDate) : "the end of your current period"}, then your
        account returns to the free view. Your blocked-company list is removed.
      </p>
      {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={cancel}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white disabled:opacity-50"
        >
          Keep subscription
        </button>
      </div>
    </div>
  );
}
