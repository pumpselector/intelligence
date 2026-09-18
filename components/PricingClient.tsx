"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FUNDING, PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { createClient } from "@/lib/supabase/client";
import { BASE_PRICE, formatEur, type PlanType } from "@/lib/pricing";

type SubmitState = { plan: PlanType | null; error: string | null };

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

const APPROVAL_NOTE =
  "Once you sign up, our admin will review and approve your account. After approval, you can subscribe and get access to the data.";

const PAYPAL_BUTTON_HEIGHT = 45;
const subscribeButtonShape = { height: PAYPAL_BUTTON_HEIGHT, borderRadius: 4 };
const SUBSCRIBE_BUTTON_CLASS =
  "flex w-full items-center justify-center px-4 text-sm font-semibold text-white transition-colors disabled:opacity-50";

function ApprovalNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500 ${className}`}
    >
      {APPROVAL_NOTE}
    </p>
  );
}

export default function PricingClient({ canSubscribe = true }: { canSubscribe?: boolean }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const subscribingBlocked = !canSubscribe;

  const [submit, setSubmit] = useState<SubmitState>({ plan: null, error: null });

  const busy = submit.plan !== null;
  const paypalEnabled = PAYPAL_CLIENT_ID.length > 0;

  async function requireUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return null;
    }
    return user.id;
  }

  async function submitRequest(plan: PlanType) {
    setSubmit({ plan, error: null });

    let res: Response;
    try {
      res = await fetch("/api/subscription-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, blockCount: 0, companies: [] }),
      });
    } catch {
      setSubmit({ plan: null, error: "Could not submit your request. Please try again." });
      return;
    }

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      detail?: string;
    };

    if (!res.ok || !data.ok) {
      if (data.error === "unauthorized") {
        router.push("/login");
        return;
      }
      const message =
        data.error === "not_approved"
          ? APPROVAL_NOTE
          : data.detail || data.error || "Could not submit your request.";
      setSubmit({ plan: null, error: message });
      return;
    }

    setSubmit({ plan: null, error: null });
    router.push("/subscribe/thanks");
  }

  async function createPaypalSubscription(plan: PlanType): Promise<string> {
    setSubmit({ plan, error: null });

    const userId = await requireUserId();
    if (!userId) throw new Error("Please sign in to continue.");

    const res = await fetch("/api/paypal/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, blockCount: 0, companies: [] }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      subscriptionId?: string;
      error?: string;
      detail?: string;
    };

    if (!res.ok || !data.subscriptionId) {
      const message =
        data.error === "unauthorized"
          ? "Please sign in to continue."
          : data.error === "not_approved"
            ? APPROVAL_NOTE
            : data.detail || data.error || "Could not start checkout.";
      setSubmit({ plan: null, error: message });
      throw new Error(message);
    }

    return data.subscriptionId;
  }

  async function handlePaypalApprove(data: { subscriptionID?: string | null }) {
    try {
      if (data.subscriptionID) {
        await fetch("/api/paypal/activate-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId: data.subscriptionID }),
        });
      }
    } finally {
      setSubmit({ plan: null, error: null });
      router.push("/subscribe/thanks");
    }
  }

  function handlePaypalError(err: unknown) {
    setSubmit({
      plan: null,
      error: err instanceof Error ? err.message : "PayPal checkout failed. Please try again.",
    });
  }

  function handlePaypalCancel() {
    setSubmit({ plan: null, error: null });
  }

  const content = (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
<div className="mx-auto w-full max-w-md">
  <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Single price, All data !
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Full access to pump producer and pump dealer data across every market we track.
          </p>
        </div>

        {submit.error && (
          <p className="mx-auto mt-6 max-w-md rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {submit.error}
          </p>
        )}

        <div className="mt-8">
          <div className="flex flex-col rounded-xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Monthly Subscription</h2>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {formatEur(BASE_PRICE)}
              <span className="text-sm font-normal text-slate-400"> / month</span>
            </p>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600">
              No commitment, cancel anytime.
            </p>

            <div className="mt-8 flex min-h-[45px] flex-col justify-end">
              {subscribingBlocked ? (
                <ApprovalNote />
              ) : paypalEnabled ? (
                <PayPalButtons
                  className="leading-[0]"
                  fundingSource={FUNDING.PAYPAL}
                  style={{
                    layout: "vertical",
                    label: "subscribe",
                    shape: "rect",
                    height: PAYPAL_BUTTON_HEIGHT,
                  }}
                  forceReRender={["standard"]}
                  createSubscription={() => createPaypalSubscription("standard")}
                  onApprove={handlePaypalApprove}
                  onError={handlePaypalError}
                  onCancel={handlePaypalCancel}
                />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => submitRequest("standard")}
                  style={subscribeButtonShape}
                  className={`${SUBSCRIBE_BUTTON_CLASS} bg-slate-900 hover:bg-slate-800`}
                >
                  {submit.plan === "standard" ? "Submitting…" : "Select"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  if (!paypalEnabled) return content;

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        intent: "subscription",
        vault: true,
        currency: "EUR",
        components: "buttons",
        disableFunding: [
          "card",
          "credit",
          "paylater",
          "sepa",
          "bancontact",
          "ideal",
          "giropay",
          "sofort",
          "eps",
          "mybank",
          "p24",
          "venmo",
          "blik",
          "trustly",
        ].join(","),
      }}
    >
      {content}
    </PayPalScriptProvider>
  );
}
