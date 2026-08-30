import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess, hasFullAccess } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fill one blocked-company slot from Settings.
 *
 * Replaces the direct `supabase.from("blocked_companies").insert/update` calls
 * in components/settings/BlockedCompaniesSection.tsx. Migration 0022 removed the
 * client INSERT/UPDATE policies, so this service-role route is the only write
 * path. It re-derives the paid slot count from subscription_requests itself and
 * refuses to let the user exceed it — the client-supplied slot count is never
 * trusted.
 *
 * Body: { slotId?: string, companyName: string }
 *   - slotId present -> name an existing, still-empty active row (no new slot)
 *   - slotId absent   -> create a new row, only if a paid slot is still free
 */

const MAX_COMPANY_NAME_LEN = 200;

const ROW_COLUMNS =
  "id, company_name, status, effective_from, requested_at, active_until, is_billable_addition";

type Body = { slotId?: unknown; companyName?: unknown };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Competitor blocking is a paid feature (mirrors app/settings/page.tsx).
  const access = await getAccess();
  if (!hasFullAccess(access.level)) {
    return NextResponse.json({ error: "not_paid" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const slotId = typeof body.slotId === "string" && body.slotId.length > 0 ? body.slotId : null;

  if (!companyName) {
    return NextResponse.json({ error: "company_name_required" }, { status: 422 });
  }
  if (companyName.length > MAX_COMPANY_NAME_LEN) {
    return NextResponse.json({ error: "company_name_too_long" }, { status: 422 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "server_not_configured" }, { status: 503 });
  }

  // Authoritative paid slot count: the user's most recent subscription request
  // (same selection app/settings/page.tsx uses to render the slots).
  const { data: latestRequest } = await admin
    .from("subscription_requests")
    .select("status, blocked_company_count")
    .eq("user_id", user.id)
    .in("status", ["active", "pending_payment", "past_due", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string; blocked_company_count: number | null }>();

  if (!latestRequest || latestRequest.status === "cancelled") {
    return NextResponse.json({ error: "subscription_inactive" }, { status: 403 });
  }
  const slotCount = latestRequest.blocked_company_count ?? 0;

  // Rows that currently occupy a paid slot: active + not deactivated.
  const { data: occupyingRows, error: occErr } = await admin
    .from("blocked_companies")
    .select("id, company_name")
    .eq("user_id", user.id)
    .is("deactivated_at", null)
    .eq("status", "active");
  if (occErr) {
    return NextResponse.json({ error: "lookup_failed", detail: occErr.message }, { status: 500 });
  }
  const rows = occupyingRows ?? [];

  // ---- Name an existing empty slot (no new slot consumed) ----
  if (slotId) {
    const row = rows.find((r) => r.id === slotId);
    if (!row) {
      return NextResponse.json({ error: "slot_not_found" }, { status: 404 });
    }
    if ((row.company_name ?? "").trim() !== "") {
      return NextResponse.json({ error: "slot_already_filled" }, { status: 409 });
    }

    const { data, error } = await admin
      .from("blocked_companies")
      .update({ company_name: companyName, status: "active" })
      .eq("id", slotId)
      .eq("user_id", user.id)
      .select(ROW_COLUMNS)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "update_failed", detail: error?.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, row: data });
  }

  // ---- Create a new row for a paid-but-unmaterialised slot ----
  if (rows.length >= slotCount) {
    return NextResponse.json(
      { error: "slot_limit_reached", slotCount, occupied: rows.length },
      { status: 409 }
    );
  }

  const { data, error } = await admin
    .from("blocked_companies")
    .insert({ user_id: user.id, company_name: companyName, status: "active" })
    .select(ROW_COLUMNS)
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "insert_failed", detail: error?.message },
      { status: 500 }
    );
  }

  // Race guard: if a concurrent request also inserted, we may now be over the
  // paid count. Roll our row back rather than hand out a free slot.
  const { count: nowActive } = await admin
    .from("blocked_companies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("deactivated_at", null)
    .eq("status", "active");
  if ((nowActive ?? 0) > slotCount) {
    await admin.from("blocked_companies").delete().eq("id", data.id).eq("user_id", user.id);
    return NextResponse.json(
      { error: "slot_limit_reached", slotCount, occupied: nowActive ?? slotCount },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, row: data });
}
