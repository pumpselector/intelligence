"use client";

import { useMemo, useState } from "react";

export type BlockedCompany = {
  id: string;
  company_name: string;
  status: "pending_next_cycle" | "active" | "removed_pending" | string;
  effective_from: string | null;
  requested_at: string;
  active_until: string | null;
  is_billable_addition: boolean;
};

const SUPPORT_EMAIL = "dealers@pumpradar24.com";

function formatActiveUntil(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Map an API error code to a message the user can act on. */
function friendlyError(code: string | undefined): string {
  switch (code) {
    case "slot_limit_reached":
      return `You've filled all your blocked-company slots. Email ${SUPPORT_EMAIL} to add more.`;
    case "slot_already_filled":
      return "That slot is already filled.";
    case "not_paid":
    case "subscription_inactive":
      return "Competitor blocking is part of an active paid subscription.";
    case "company_name_too_long":
      return "That name is too long.";
    case "company_name_required":
      return "Enter a company name.";
    default:
      return "Could not save.";
  }
}

type FillResult = { row: BlockedCompany } | { error: string };

async function callFillSlot(companyName: string, slotId?: string): Promise<FillResult> {
  let res: Response;
  try {
    res = await fetch("/api/blocked-companies/fill-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, slotId }),
    });
  } catch {
    return { error: "Could not save — check your connection." };
  }
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    row?: BlockedCompany;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.row) {
    return { error: friendlyError(data.error) };
  }
  return { row: data.row };
}

/** A single input + Save row. Shows a static confirmation line once saved. */
function InlineSaveInput({
  onSave,
}: {
  onSave: (trimmed: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    setBusy(true);
    setError(null);
    const err = await onSave(trimmed);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSaved(trimmed);
  }

  if (saved !== null) {
    return <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">{saved}</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Company name or domain"
          className="w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-solid focus:border-slate-400"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || value.trim().length === 0}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Read-only view of a subscriber's blocked-company slots.
 *
 * The number of slots is fixed at `slotCount` (their paid
 * blocked_company_count). Named slots are shown greyed out; empty slots get a
 * one-time "Save" input that just fills the name (status -> 'active'). Writes go
 * through /api/blocked-companies/fill-slot, which re-checks the paid slot count
 * server-side (migration 0022 removed the direct client write path). There is
 * no add / remove / reschedule here — changing the slot count or editing an
 * existing name is handled manually by the team over email.
 */
export default function BlockedCompaniesSection({
  slotCount,
  initial,
}: {
  slotCount: number;
  initial: BlockedCompany[];
}) {
  const [rows, setRows] = useState<BlockedCompany[]>(initial);

  const activeRows = useMemo(
    () =>
      rows
        .filter((r) => r.status === "active")
        .sort((a, b) => a.requested_at.localeCompare(b.requested_at)),
    [rows]
  );
  const namedActive = useMemo(
    () => activeRows.filter((r) => r.company_name.trim().length > 0),
    [activeRows]
  );
  const emptyActive = useMemo(
    () => activeRows.filter((r) => r.company_name.trim().length === 0),
    [activeRows]
  );

  // UI-only slots that have no blocked_companies row yet — one stable id each,
  // derived once from the gap between paid slots and existing active rows.
  // Filling one removes it from the list (never re-derived from a shrinking
  // count) so React never hands a just-saved input to another slot position.
  const [virtualSlots, setVirtualSlots] = useState<string[]>(() => {
    const deficit = Math.max(0, slotCount - namedActive.length - emptyActive.length);
    return Array.from({ length: deficit }, () => crypto.randomUUID());
  });

  const totalSlots = namedActive.length + emptyActive.length + virtualSlots.length;

  /** Put a name on an existing blank, already-paid slot. Immediately active. */
  async function fillExistingSlot(name: string, existingId: string): Promise<string | null> {
    const result = await callFillSlot(name, existingId);
    if ("error" in result) return result.error;
    setRows((prev) => prev.map((r) => (r.id === existingId ? result.row : r)));
    return null;
  }

  /** Put a name on a paid slot that had no row yet. Immediately active. */
  async function fillVirtualSlot(name: string, virtualKey: string): Promise<string | null> {
    const result = await callFillSlot(name);
    if ("error" in result) return result.error;
    setRows((prev) => [...prev, result.row]);
    setVirtualSlots((prev) => prev.filter((k) => k !== virtualKey));
    return null;
  }

  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-slate-700">Your active blocked companies</p>
      <p className="mt-1 text-xs text-slate-400">
        If the company you want to block is already a subscriber, we&apos;ll contact you to resolve
        this — blocking is not possible for existing members.
      </p>

      {totalSlots === 0 ? (
        <p className="mt-2 text-sm text-slate-500">You don&apos;t have any blocked-company slots yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {namedActive.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 py-2.5">
              <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">
                {row.company_name}
              </span>
              {row.active_until && (
                <span className="shrink-0 text-xs text-slate-400">
                  Active until: {formatActiveUntil(row.active_until)}
                </span>
              )}
            </li>
          ))}
          {emptyActive.map((row) => (
            <li key={row.id} className="py-2">
              <InlineSaveInput onSave={(name) => fillExistingSlot(name, row.id)} />
            </li>
          ))}
          {virtualSlots.map((key) => (
            <li key={key} className="py-2">
              <InlineSaveInput onSave={(name) => fillVirtualSlot(name, key)} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
        To change the number of blocked companies or update this list, please email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-amber-700 hover:text-amber-800">
          {SUPPORT_EMAIL}
        </a>{" "}
        — we&apos;ll take care of it for you.
      </p>
    </div>
  );
}
