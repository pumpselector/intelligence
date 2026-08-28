"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BlockedCompany = {
  id: string;
  company_name: string;
  status: "pending_next_cycle" | "active" | "removed_pending" | string;
  effective_from: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_next_cycle: "starts next billing cycle",
  active: "active",
  removed_pending: "removal pending",
};

export default function BlockedCompaniesSection({
  userId,
  initial,
}: {
  userId: string;
  initial: BlockedCompany[];
}) {
  const [supabase] = useState(() => createClient());
  const [list, setList] = useState<BlockedCompany[]>(initial);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCompany(e: React.FormEvent) {
    e.preventDefault();
    const company_name = newName.trim();
    if (!company_name || busy) return;
    setBusy(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("blocked_companies")
      .insert({ user_id: userId, company_name, status: "pending_next_cycle" })
      .select("id, company_name, status, effective_from")
      .single();

    setBusy(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "Could not add company.");
      return;
    }

    setList((prev) => [...prev, data as BlockedCompany]);
    setNewName("");
  }

  async function requestRemoval(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("blocked_companies")
      .update({ status: "removed_pending" })
      .eq("id", id);

    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "removed_pending" } : c))
    );
  }

  return (
    <div className="mt-3">
      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Changes take effect from your next billing cycle. Your current plan remains active with the
        existing list until then.
      </p>

      {list.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {list.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span
                className={`text-sm font-medium ${
                  c.status === "removed_pending" ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {c.company_name}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {STATUS_LABEL[c.status] ?? c.status}
                  {c.effective_from ? ` · effective from ${c.effective_from}` : ""}
                </span>
                {c.status !== "removed_pending" && (
                  <button
                    type="button"
                    onClick={() => requestRemoval(c.id)}
                    disabled={busy}
                    className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addCompany} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Company name or domain"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"
        />
        <button
          type="submit"
          disabled={busy || newName.trim().length === 0}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
