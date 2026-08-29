"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function PricingClient() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>(1);
  const [count, setCount] = useState(0);
  const [companies, setCompanies] = useState<string[]>([]);
  const [submit, setSubmit] = useState<SubmitState>({ plan: null, error: null });

  const modalTotal = blockingPrice(count);
  const busy = submit.plan !== null;

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

  async function subscribe(plan: PlanType, price: number, blocked: string[]) {
    setSubmit({ plan, error: null });

    const userId = await requireUserId();
    if (!userId) return;

    // First-ever subscription: nothing has an "active" billing cycle yet, so
    // blocked companies take effect immediately instead of waiting on one.
    const { count: activeCount, error: countError } = await supabase
      .from("subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active");

    if (countError) {
      setSubmit({ plan: null, error: countError.message });
      return;
    }

    const isFirstSubscription = (activeCount ?? 0) === 0;

    const { error: reqError } = await supabase
      .from("subscription_requests")
      .insert({ user_id: userId, plan_type: plan, monthly_price: price });

    if (reqError) {
      setSubmit({ plan: null, error: reqError.message });
      return;
    }

    if (blocked.length > 0) {
      const { error: blockError } = await supabase.from("blocked_companies").insert(
        blocked.map((company_name) => ({
          user_id: userId,
          company_name,
          status: isFirstSubscription ? "active" : "pending_next_cycle",
        }))
      );

      if (blockError) {
        setSubmit({ plan: null, error: blockError.message });
        return;
      }
    }

    router.push("/subscribe/thanks");
  }

  function openBlockingModal() {
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
    subscribe("standard", BASE_PRICE, []);
  }

  function subscribeToBlocking() {
    const filled = companies.map((c) => c.trim()).filter((c) => c.length > 0);
    subscribe("blocking", blockingPrice(count), filled);
  }

  return (
    <main className="flex flex-1 flex-col bg-slate-50 px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Choose your plan</h1>
          <p className="mt-3 text-sm text-slate-500">
            Full access to manufacturer and dealer data across every market we track.
          </p>
        </div>

        {submit.error && (
          <p className="mx-auto mt-6 max-w-md rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {submit.error}
          </p>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Standard */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Standard</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {formatEur(BASE_PRICE)}
              <span className="text-sm font-normal text-slate-400"> / month</span>
            </p>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
              Full access to manufacturer and dealer data.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => subscribe("standard", BASE_PRICE, [])}
              className="mt-6 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {submit.plan === "standard" ? "Submitting…" : "Select"}
            </button>
          </div>

          {/* Block Competitors */}
          <div className="flex flex-col rounded-xl border-2 border-amber-300 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Block Competitors</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {formatEur(BASE_PRICE)}
              <span className="text-sm font-normal text-slate-400">
                {" "}
                + {formatEur(PER_BLOCK_PRICE)} per blocked company / month
              </span>
            </p>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
              Everything in Standard, plus: prevent specific competitor domains from accessing the
              platform.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={openBlockingModal}
              className="mt-6 w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              Select
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
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
                      onClick={subscribeToStandard}
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
                  <button
                    type="button"
                    disabled={busy}
                    onClick={subscribeToBlocking}
                    className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Subscribe"}
                  </button>
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
        </div>
      )}
    </main>
  );
}
