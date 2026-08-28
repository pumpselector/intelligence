"use client";

import { useMemo, useState } from "react";
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

export default function PricingClient() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [modalOpen, setModalOpen] = useState(false);
  const [companies, setCompanies] = useState<string[]>([""]);
  const [submit, setSubmit] = useState<SubmitState>({ plan: null, error: null });

  const filledCompanies = useMemo(
    () => companies.map((c) => c.trim()).filter((c) => c.length > 0),
    [companies]
  );
  const modalTotal = blockingPrice(filledCompanies.length);

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

    const { error: reqError } = await supabase
      .from("subscription_requests")
      .insert({ user_id: userId, plan_type: plan, monthly_price: price });

    if (reqError) {
      setSubmit({ plan: null, error: reqError.message });
      return;
    }

    if (blocked.length > 0) {
      const { error: blockError } = await supabase
        .from("blocked_companies")
        .insert(blocked.map((company_name) => ({ user_id: userId, company_name })));

      if (blockError) {
        setSubmit({ plan: null, error: blockError.message });
        return;
      }
    }

    router.push("/subscribe/thanks");
  }

  function updateCompany(index: number, value: string) {
    setCompanies((list) => list.map((c, i) => (i === index ? value : c)));
  }

  function addCompanyRow() {
    setCompanies((list) => [...list, ""]);
  }

  function removeCompanyRow(index: number) {
    setCompanies((list) => (list.length === 1 ? [""] : list.filter((_, i) => i !== index)));
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
              onClick={() => {
                setSubmit({ plan: null, error: null });
                setModalOpen(true);
              }}
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
          onClick={() => !busy && setModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">
              Which companies would you like to block?
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter a company name or domain. You can change this list later.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {companies.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateCompany(index, e.target.value)}
                    placeholder="competitor.com"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeCompanyRow(index)}
                    aria-label="Remove"
                    className="shrink-0 rounded-md border border-slate-200 px-2 py-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCompanyRow}
              className="mt-2 text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
            >
              + Add another
            </button>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">Monthly total</span>
              <span className="text-xl font-semibold text-slate-900">{formatEur(modalTotal)}</span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy || filledCompanies.length === 0}
                onClick={() =>
                  subscribe("blocking", blockingPrice(filledCompanies.length), filledCompanies)
                }
                className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {busy
                  ? "Submitting…"
                  : `Continue with ${filledCompanies.length} ${
                      filledCompanies.length === 1 ? "company" : "companies"
                    }`}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => subscribe("blocking", BASE_PRICE, [])}
                className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                I&apos;ll add this later
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
