"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { FUNDING, PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { createClient } from "@/lib/supabase/client";
import {
  BASE_PRICE,
  PER_BLOCK_PRICE,
  blockingPrice,
  formatEur,
  type PlanType,
} from "@/lib/pricing";

type SubmitState = { plan: PlanType | null; error: string | null };
type ModalStep = 1 | 2;

// Exposed to the browser at build time. When empty, /pricing keeps the old
// "request received" flow (no real payment) so the site works without PayPal
// credentials; fill NEXT_PUBLIC_PAYPAL_CLIENT_ID (+ the server PAYPAL_* vars) to
// switch on PayPal checkout with no code change.
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

const APPROVAL_NOTE =
  "Once you sign up, our admin will review and approve your account. After approval, you can subscribe and get access to the data.";

// The PayPal smart button renders at `style.height` px with `shape: "rect"`,
// which the SDK draws with 4px corners. The plain <button>s on the pricing
// cards mirror those exact dimensions so the Standard (PayPal) and Block
// Competitors (Select) cards line up — same height, same corner radius, same
// baseline inside the shared `mt-6 min-h-[52px]` wrapper. Colour is unchanged.
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

const BLOCKING_INFO =
  "With this option, you can prevent as many competitors as you'd like from accessing the system. Every user on PumpRadar24 is approved by an admin — sign-ups from generic addresses like Gmail, Hotmail, or 163.com are not accepted. Simply provide the name of the company you want to restrict, and we'll prevent them from joining.";

/** Small "i" affordance next to the Block Competitors price. Hover or click. */
function BlockingInfoTooltip() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="About the Block Competitors plan"
        aria-expanded={open}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
      >
        <Info className="h-3 w-3" strokeWidth={2} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-7 z-30 w-[min(18rem,calc(100vw-3rem))] rounded-md border border-slate-200 bg-white p-3 text-left text-xs font-normal leading-relaxed text-slate-600 shadow-lg"
        >
          {BLOCKING_INFO}
        </div>
      )}
    </div>
  );
}

export default function PricingClient({ canSubscribe = true }: { canSubscribe?: boolean }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  // Only admin-approved users can subscribe. Everyone else — visitors with no
  // session and signed-in-but-unapproved users alike — gets the approval note
  // in place of every payment button, with no redirect. The server enforces
  // the same rule (/api/paypal/create-subscription returns 403).
  const subscribingBlocked = !canSubscribe;

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>(1);
  const [count, setCount] = useState(0);
  const [companies, setCompanies] = useState<string[]>([]);
  const [submit, setSubmit] = useState<SubmitState>({ plan: null, error: null });

  // Always-current company list for the PayPal button's create callback, which
  // is captured once per `forceReRender` and can't see later state directly.
  const companiesRef = useRef<string[]>([]);
  useEffect(() => {
    companiesRef.current = companies;
  }, [companies]);

  const modalTotal = blockingPrice(count);
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

  // ---- Fallback flow (no PayPal credentials): record a request row only ----
  // The insert used to happen straight from the browser; it now goes through
  // /api/subscription-requests/create, which re-checks approval and computes
  // the price server-side (migration 0022 removed the client write policy).
  async function submitRequest(plan: PlanType, blocked: string[], blockedCount: number) {
    setSubmit({ plan, error: null });

    let res: Response;
    try {
      res = await fetch("/api/subscription-requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, blockCount: blockedCount, companies: blocked }),
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

  // ---- PayPal flow: create the subscription server-side, then approve ----
  // A single in-flight create call, shared between concurrent invocations of
  // the PayPal button's createSubscription callback (double-click, re-render).
  // Without this each call spins up its own PayPal subscription server-side.
  const createInFlight = useRef<Promise<string> | null>(null);

  function startPaypalSubscription(
    plan: PlanType,
    blockCount: number,
    blocked: string[]
  ): Promise<string> {
    if (createInFlight.current) return createInFlight.current;
    const promise = createPaypalSubscription(plan, blockCount, blocked).finally(() => {
      createInFlight.current = null;
    });
    createInFlight.current = promise;
    return promise;
  }

  async function createPaypalSubscription(
    plan: PlanType,
    blockCount: number,
    blocked: string[]
  ): Promise<string> {
    setSubmit({ plan, error: null });

    const userId = await requireUserId();
    if (!userId) throw new Error("Please sign in to continue.");

    const res = await fetch("/api/paypal/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, blockCount, companies: blocked }),
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
      setModalOpen(false);
      router.push("/subscribe/thanks");
    }
  }

  function handlePaypalError(err: unknown) {
    createInFlight.current = null;
    setSubmit({
      plan: null,
      error: err instanceof Error ? err.message : "PayPal checkout failed. Please try again.",
    });
  }

  // The buyer closed the PayPal popup without paying. Reset so the buttons /
  // "Select" become usable again without a page refresh.
  function handlePaypalCancel() {
    createInFlight.current = null;
    setSubmit({ plan: null, error: null });
  }

  function openBlockingModal() {
    if (subscribingBlocked) return;
    setSubmit({ plan: null, error: null });
    setStep(1);
    setCount(0);
    setCompanies([]);
    setModalOpen(true);
  }

  function closeModal() {
    if (busy) return;
    setModalOpen(false);
  }

  function increment() {
    setCount((c) => c + 1);
  }

  function decrement() {
    setCount((c) => Math.max(0, c - 1));
  }

  function goToStep2() {
    if (count === 0) return;
    setCompanies((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push("");
      return next;
    });
    setStep(2);
  }

  function updateCompany(index: number, value: string) {
    setCompanies((list) => list.map((c, i) => (i === index ? value : c)));
  }

  function subscribeToStandard() {
    setModalOpen(false);
    submitRequest("standard", [], 0);
  }

  function subscribeToBlocking() {
    const filled = companies.map((c) => c.trim()).filter((c) => c.length > 0);
    submitRequest("blocking", filled, count);
  }

  const content = (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Choose your plan</h1>
          <p className="mt-3 text-sm text-slate-500">
            Full access to pump producer and pump dealer data across every market we track.
          </p>
        </div>

        {submit.error && (
          <p className="mx-auto mt-6 max-w-md rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {submit.error}
          </p>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Standard — border-2 (not border) so its content box matches the
              border-2 Block Competitors card exactly and the CTAs line up. */}
          <div className="flex flex-col rounded-xl border-2 border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Standard</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {formatEur(BASE_PRICE)}
              <span className="text-sm font-normal text-slate-400"> / month</span>
            </p>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
              Full access to pump producer and pump dealer data.
            </p>

            <div className="mt-6 flex min-h-[45px] flex-col justify-end">
              {subscribingBlocked ? (
                <ApprovalNote />
              ) : paypalEnabled ? (
                <PayPalButtons
                  // The SDK renders `.paypal-buttons` as an inline-block inside
                  // this container; `leading-[0]` kills the baseline strut so the
                  // container is exactly PAYPAL_BUTTON_HEIGHT px and lines up
                  // with the plain <button> on the Block Competitors card.
                  className="leading-[0]"
                  fundingSource={FUNDING.PAYPAL}
                  style={{
                    layout: "vertical",
                    label: "subscribe",
                    shape: "rect",
                    height: PAYPAL_BUTTON_HEIGHT,
                  }}
                  forceReRender={["standard"]}
                  createSubscription={() => startPaypalSubscription("standard", 0, [])}
                  onApprove={handlePaypalApprove}
                  onError={handlePaypalError}
                  onCancel={handlePaypalCancel}
                />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => submitRequest("standard", [], 0)}
                  style={subscribeButtonShape}
                  className={`${SUBSCRIBE_BUTTON_CLASS} bg-slate-900 hover:bg-slate-800`}
                >
                  {submit.plan === "standard" ? "Submitting…" : "Select"}
                </button>
              )}
            </div>
          </div>

          {/* Block Competitors */}
          <div className="flex flex-col rounded-xl border-2 border-amber-300 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Block Competitors</h2>
            <div className="mt-2 flex items-start gap-1.5">
              <p className="flex-1 text-2xl font-semibold tracking-tight text-slate-900">
                {formatEur(BASE_PRICE)}
                <span className="text-sm font-normal text-slate-400">
                  {" "}
                  + {formatEur(PER_BLOCK_PRICE)} per blocked company / month
                </span>
              </p>
              <span className="mt-1 shrink-0">
                <BlockingInfoTooltip />
              </span>
            </div>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
              Everything in Standard, plus: prevent specific competitors from accessing the platform.
            </p>
            <div className="mt-6 flex min-h-[45px] flex-col justify-end">
              {subscribingBlocked ? (
                <ApprovalNote />
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={openBlockingModal}
                  style={subscribeButtonShape}
                  className={`${SUBSCRIBE_BUTTON_CLASS} bg-amber-600 hover:bg-amber-700`}
                >
                  Select
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rendered on <body> via a portal so it sits above the PayPal button
          iframes regardless of the page's stacking contexts. `modalOpen` is
          false during SSR / first render, so the portal only runs client-side. */}
      {modalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={closeModal}
          >
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            {step === 1 ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900">
                  How many companies would you like to block?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  You can name them now or leave the list empty and fill it in later from Settings.
                </p>

                <div className="mt-6 flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={decrement}
                    disabled={count === 0}
                    aria-label="Decrease"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-16 text-center text-4xl font-bold tabular-nums text-slate-900">
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={increment}
                    aria-label="Increase"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xl font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">Monthly total</span>
                  <span className="text-xl font-semibold text-slate-900">{formatEur(modalTotal)}</span>
                </div>

                {count === 0 && (
                  <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Blocking requires at least 1 company.{" "}
                    <button
                      type="button"
                      onClick={paypalEnabled ? () => setModalOpen(false) : subscribeToStandard}
                      className="font-medium text-amber-700 hover:text-amber-800"
                    >
                      Choose the Standard plan instead
                    </button>
                    .
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={count === 0}
                    onClick={goToStep2}
                    className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900">
                  Which {count === 1 ? "company" : "companies"} would you like to block?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Optional — leave any of these blank and add the names later from Settings.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  If the company you want to block is already a subscriber, we&apos;ll contact you to
                  resolve this — blocking is not possible for existing members.
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {companies.map((value, index) => (
                    <input
                      key={index}
                      type="text"
                      value={value}
                      onChange={(e) => updateCompany(index, e.target.value)}
                      placeholder={`Company ${index + 1} (optional)`}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm text-slate-500">Monthly total</span>
                  <span className="text-xl font-semibold text-slate-900">{formatEur(modalTotal)}</span>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {paypalEnabled ? (
                    <PayPalButtons
                      fundingSource={FUNDING.PAYPAL}
                      style={{ layout: "vertical", label: "subscribe", shape: "rect", height: 45 }}
                      forceReRender={[count]}
                      createSubscription={() =>
                        startPaypalSubscription(
                          "blocking",
                          count,
                          companiesRef.current.map((c) => c.trim()).filter((c) => c.length > 0)
                        )
                      }
                      onApprove={handlePaypalApprove}
                      onError={handlePaypalError}
                      onCancel={handlePaypalCancel}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={subscribeToBlocking}
                      className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                    >
                      {busy ? "Submitting…" : "Subscribe"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep(1)}
                    className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
            </div>
          </div>,
          document.body
        )}
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
        // Standard PayPal button only. The PayPal flow already covers card /
        // guest checkout inside its own popup, so every alternate funding
        // source — SEPA/IBAN direct debit, the separate card button, and the
        // regional bank redirects the SDK adds automatically — is turned off.
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
