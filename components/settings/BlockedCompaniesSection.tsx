"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PER_BLOCK_PRICE, formatEur } from "@/lib/pricing";

export type BlockedCompany = {
  id: string;
  company_name: string;
  status: "pending_next_cycle" | "active" | "removed_pending" | string;
  effective_from: string | null;
  requested_at: string;
  active_until: string | null;
  is_billable_addition: boolean;
};

const ROW_COLUMNS =
  "id, company_name, status, effective_from, requested_at, active_until, is_billable_addition";

function formatActiveUntil(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** A single input + Save row. Shows a static confirmation line once saved. */
function InlineSaveInput({
  placeholder,
  initialValue = "",
  buttonLabel = "Save",
  requireValue = true,
  onSave,
  savedLabel,
}: {
  placeholder: string;
  initialValue?: string;
  buttonLabel?: string;
  requireValue?: boolean;
  onSave: (trimmed: string) => Promise<string | null>;
  savedLabel: (trimmed: string) => string;
}) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = value.trim();
    setBusy(true);
    setError(null);
    const err = await onSave(trimmed);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSaved(savedLabel(trimmed));
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
          placeholder={placeholder}
          className="w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-solid focus:border-slate-400"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || (requireValue && value.trim().length === 0)}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : buttonLabel}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** A pending (next-cycle) slot: rename it, or give it up entirely. */
function PendingSlotRow({
  row,
  cancelling,
  onRename,
  onCancel,
}: {
  row: BlockedCompany;
  cancelling: boolean;
  onRename: (name: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(row.company_name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  const dirty = value.trim().length > 0 && value.trim() !== row.company_name.trim();

  async function handleSave() {
    setSaving(true);
    setError(null);
    const err = await onRename(value);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setSavedName(value.trim());
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSavedName(null);
          }}
          placeholder="Company name or domain"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || cancelling || !dirty}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving || cancelling}
          className="shrink-0 rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancelling ? "Cancelling…" : "Cancel slot"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {savedName && !error && (
        <p className="mt-1 text-xs text-emerald-600">Renamed to “{savedName}”.</p>
      )}
    </div>
  );
}

export default function BlockedCompaniesSection({
  userId,
  slotCount,
  initial,
  isFirstSubscription,
}: {
  userId: string;
  slotCount: number;
  initial: BlockedCompany[];
  isFirstSubscription: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<BlockedCompany[]>(initial);
  const [keepSame, setKeepSame] = useState(true);
  const [newSlotKeys, setNewSlotKeys] = useState<string[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [revisionNotice, setRevisionNotice] = useState<
    { tone: "ok" | "action" | "error"; text: string; url?: string } | null
  >(null);

  // After a change that moves the next-cycle block count (a billable add, or a
  // slot given up), re-sync the PayPal subscription amount. The server recomputes
  // the count from the block list itself, so no number is passed here.
  async function syncRevision() {
    try {
      const res = await fetch("/api/paypal/revise-subscription", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        price?: number;
        approvalUrl?: string | null;
        needsApproval?: boolean;
        unchanged?: boolean;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        if (res.status === 404) return; // no billable subscription to revise
        setRevisionNotice({
          tone: "error",
          text:
            data.detail ??
            data.error ??
            "Could not update your subscription amount. Please try again.",
        });
        return;
      }
      if (data.unchanged) return;
      if (data.needsApproval && data.approvalUrl) {
        // The new (higher) amount only takes effect once the buyer re-consents
        // on PayPal. Show a persistent CTA rather than auto-redirecting — the
        // user may still be editing more slots.
        setRevisionNotice({
          tone: "action",
          text: `Your monthly amount will change to ${formatEur(
            data.price ?? 0
          )} from your next billing date — PayPal needs your approval first.`,
          url: data.approvalUrl,
        });
        return;
      }
      setRevisionNotice({
        tone: "ok",
        text: `Saved. Your monthly amount changes to ${formatEur(
          data.price ?? 0
        )} from your next billing date.`,
      });
    } catch {
      setRevisionNotice({ tone: "error", text: "Could not reach the billing service." });
    }
  }

  // Slots that exist only in the UI, not yet backed by a blocked_companies
  // row -- one stable id per open slot, created once from the initial
  // deficit. Filling one removes it from this array (never re-derived from a
  // shrinking count), so a slot never gets silently reassigned to a
  // different position after a save -- that reassignment was the cause of
  // the "extra box" bug: keying an Array.from({length}) by position let React
  // hand a just-saved slot's stateful input to whatever slot next occupied
  // that index, dragging its "saved" confirmation along with it.
  const [virtualSlots, setVirtualSlots] = useState<string[]>(() => {
    const initialActiveCount = initial.filter((r) => r.status === "active").length;
    const deficit = Math.max(0, slotCount - initialActiveCount);
    return Array.from({ length: deficit }, () => crypto.randomUUID());
  });

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
  const totalSlots = namedActive.length + emptyActive.length + virtualSlots.length;

  // Slots queued for the next billing cycle — "+ Add another company" additions
  // and any next-cycle name changes. Still editable: the user can rename them or
  // give them up entirely before the cycle they belong to starts.
  const pendingRows = useMemo(
    () =>
      rows
        .filter((r) => r.status === "pending_next_cycle")
        .sort((a, b) => a.requested_at.localeCompare(b.requested_at)),
    [rows]
  );

  // Filling an empty slot (an existing blank "active" row, or one of the N
  // slots that has no row at all yet) takes effect immediately only for a
  // user's very first fill ever -- otherwise it waits for the next cycle,
  // same rule as the /pricing first-subscription check.
  async function fillExistingSlot(name: string, existingId: string): Promise<string | null> {
    const status = isFirstSubscription ? "active" : "pending_next_cycle";
    const { data, error: updateError } = await supabase
      .from("blocked_companies")
      .update({ company_name: name, status })
      .eq("id", existingId)
      .select(ROW_COLUMNS)
      .single();
    if (updateError || !data) return updateError?.message ?? "Could not save.";
    setRows((prev) => prev.map((r) => (r.id === existingId ? (data as BlockedCompany) : r)));
    return null;
  }

  async function fillVirtualSlot(name: string, virtualKey: string): Promise<string | null> {
    const status = isFirstSubscription ? "active" : "pending_next_cycle";
    const { data, error: insertError } = await supabase
      .from("blocked_companies")
      .insert({ user_id: userId, company_name: name, status })
      .select(ROW_COLUMNS)
      .single();
    if (insertError || !data) return insertError?.message ?? "Could not save.";
    setRows((prev) => [...prev, data as BlockedCompany]);
    setVirtualSlots((prev) => prev.filter((k) => k !== virtualKey));
    return null;
  }

  // Editing the "next cycle" list never touches the currently active rows.
  // A new/changed name is queued as a separate pending_next_cycle row; a
  // slot cleared out flags its current active row for removal. The admin
  // reconciles pending vs. active rows by hand at the next billing cycle.
  async function saveNextCycleSlot(name: string, sourceId: string | null): Promise<string | null> {
    if (name === "") {
      if (!sourceId) return null;
      const { error: updateError } = await supabase
        .from("blocked_companies")
        .update({ status: "removed_pending" })
        .eq("id", sourceId);
      if (updateError) return updateError.message;
      void syncRevision();
      return null;
    }

    const { data, error: insertError } = await supabase
      .from("blocked_companies")
      .insert({ user_id: userId, company_name: name, status: "pending_next_cycle" })
      .select(ROW_COLUMNS)
      .single();
    if (insertError || !data) return insertError?.message ?? "Could not save.";
    setRows((prev) => [...prev, data as BlockedCompany]);
    return null;
  }

  async function saveNewSlot(name: string, key: string): Promise<string | null> {
    const { data, error: insertError } = await supabase
      .from("blocked_companies")
      .insert({
        user_id: userId,
        company_name: name,
        status: "pending_next_cycle",
        is_billable_addition: true,
      })
      .select(ROW_COLUMNS)
      .single();
    if (insertError || !data) return insertError?.message ?? "Could not save.";
    // Hand the slot off to the "Pending" list (below) instead of leaving a
    // second, frozen copy in the add-a-company input.
    setRows((prev) => [...prev, data as BlockedCompany]);
    setNewSlotKeys((prev) => prev.filter((k) => k !== key));
    void syncRevision();
    return null;
  }

  /** Rename a not-yet-active slot. No price change, so no PayPal revision. */
  async function renamePendingSlot(id: string, name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (trimmed.length === 0) return "Enter a name, or cancel the slot instead.";
    const { data, error } = await supabase
      .from("blocked_companies")
      .update({ company_name: trimmed })
      .eq("id", id)
      .select(ROW_COLUMNS)
      .single();
    if (error || !data) return error?.message ?? "Could not save.";
    setRows((prev) => prev.map((r) => (r.id === id ? (data as BlockedCompany) : r)));
    return null;
  }

  /**
   * Give up a not-yet-active slot. If it was a billable addition the invoice
   * drops, so re-sync PayPal — a decrease, which PayPal applies without a
   * separate approval step.
   */
  async function cancelPendingSlot(id: string) {
    const wasBillable = rows.find((r) => r.id === id)?.is_billable_addition ?? false;
    setCancellingId(id);
    const { error } = await supabase.from("blocked_companies").delete().eq("id", id);
    setCancellingId(null);
    if (error) {
      setRevisionNotice({ tone: "error", text: error.message });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (wasBillable) void syncRevision();
  }

  const nextCycleSlots = [
    ...namedActive.map((r) => ({ key: r.id, sourceId: r.id as string | null, initialValue: r.company_name })),
    ...emptyActive.map((r) => ({ key: r.id, sourceId: r.id as string | null, initialValue: "" })),
    ...virtualSlots.map((key) => ({ key, sourceId: null as string | null, initialValue: "" })),
  ];

  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-slate-700">Your active blocked companies</p>
      <p className="mt-1 text-xs text-slate-400">
        If the company you want to block is already a subscriber, we&apos;ll contact you to resolve
        this — blocking is not possible for existing members.
      </p>

      {revisionNotice && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            revisionNotice.tone === "error"
              ? "bg-red-50 text-red-700"
              : revisionNotice.tone === "action"
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <p>{revisionNotice.text}</p>
          {revisionNotice.url && (
            <a
              href={revisionNotice.url}
              className="mt-2 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Approve the new amount on PayPal →
            </a>
          )}
        </div>
      )}

      {totalSlots === 0 ? (
        <p className="mt-2 text-sm text-slate-500">You don&apos;t have any blocked-company slots yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {namedActive.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 py-2.5">
              <span className="text-sm font-medium text-slate-800">{row.company_name}</span>
              {row.active_until && (
                <span className="shrink-0 text-xs text-slate-400">
                  Active until: {formatActiveUntil(row.active_until)}
                </span>
              )}
            </li>
          ))}
          {emptyActive.map((row) => (
            <li key={row.id} className="py-2">
              <InlineSaveInput
                placeholder="Not set yet"
                onSave={(name) => fillExistingSlot(name, row.id)}
                savedLabel={(name) =>
                  isFirstSubscription ? name : `${name} — starts next billing cycle`
                }
              />
            </li>
          ))}
          {virtualSlots.map((key) => (
            <li key={key} className="py-2">
              <InlineSaveInput
                placeholder="Not set yet"
                onSave={(name) => fillVirtualSlot(name, key)}
                savedLabel={(name) =>
                  isFirstSubscription ? name : `${name} — starts next billing cycle`
                }
              />
            </li>
          ))}
        </ul>
      )}

      {pendingRows.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-semibold text-slate-700">
            Pending — starts your next billing cycle
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Rename or cancel any of these before your next billing date. Cancelling a slot you&apos;re
            being charged for lowers your invoice by {formatEur(PER_BLOCK_PRICE)}/month.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {pendingRows.map((row) => (
              <PendingSlotRow
                key={row.id}
                row={row}
                cancelling={cancellingId === row.id}
                onRename={(name) => renamePendingSlot(row.id, name)}
                onCancel={() => cancelPendingSlot(row.id)}
              />
            ))}
          </div>
        </div>
      )}

      {totalSlots > 0 && (
        <>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={keepSame}
              onChange={(e) => setKeepSame(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Keep the same companies next cycle
              <span className="block text-xs text-slate-400">
                Uncheck to change your list for next cycle. Your current companies stay active until
                then.
              </span>
            </span>
          </label>

          {!keepSame && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">
                Leaving a box empty will cancel that slot next cycle. Your invoice will decrease by{" "}
                {formatEur(PER_BLOCK_PRICE)}/month per removed slot.
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {nextCycleSlots.map((slot) => (
                  <InlineSaveInput
                    key={slot.key}
                    placeholder="Not set yet"
                    initialValue={slot.initialValue}
                    requireValue={false}
                    onSave={(name) => saveNextCycleSlot(name, slot.sourceId)}
                    savedLabel={(name) =>
                      name === ""
                        ? "Slot cancelled — pending for next cycle"
                        : `${name} — pending for next cycle`
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4">
        {newSlotKeys.map((key) => (
          <div key={key} className="mb-2">
            <InlineSaveInput
              placeholder="New company name or domain"
              onSave={(name) => saveNewSlot(name, key)}
              savedLabel={(name) => `${name} — pending for next cycle`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setNewSlotKeys((prev) => [...prev, crypto.randomUUID()])}
          className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
        >
          + Add another company
        </button>
        <p className="mt-1 text-xs text-slate-400">
          This adds a new slot starting next billing cycle. +{formatEur(PER_BLOCK_PRICE)}/month will be
          added to your invoice.
        </p>
      </div>
    </div>
  );
}
