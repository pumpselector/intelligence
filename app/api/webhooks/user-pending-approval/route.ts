import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  approved: boolean | null;
  email_verified: boolean | null;
  created_at: string | null;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: ProfileRow | null;
  old_record: ProfileRow | null;
};

function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function formatDate(iso: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

/**
 * Supabase Database Webhook target — sibling of /api/webhooks/user-approved.
 * Fires on profiles UPDATE; when a row flips email_verified false -> true (the
 * user just confirmed their email) and is still awaiting admin approval, we
 * email the team so they can review and approve the account.
 * Auth: shared secret in the `x-webhook-secret` header (WEBHOOK_SECRET env).
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "WEBHOOK_SECRET not configured" }, { status: 500 });
  }
  if (!secretsMatch(request.headers.get("x-webhook-secret"), expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const verifiedNow = payload.record?.email_verified === true;
  const verifiedBefore = payload.old_record?.email_verified === true;
  const alreadyApproved = payload.record?.approved === true;

  // Act when email_verified becomes true and the account still needs approval:
  //  - the normal flow: an UPDATE flipping false -> true after the user clicks
  //    the confirmation link
  //  - auto-confirm (email confirmation disabled): the INSERT already has it true
  const justVerified =
    (payload.type === "UPDATE" && verifiedNow && !verifiedBefore) ||
    (payload.type === "INSERT" && verifiedNow);

  if (payload.table !== "profiles" || !justVerified || alreadyApproved) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const email = payload.record?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "verified row has no email" }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const from = process.env.RESEND_FROM || "PumpRadar24 <noreply@pumpradar24.com>";
  const to = process.env.ADMIN_NOTIFY_EMAIL || "dealers@pumpradar24.com";
  const registeredAt = formatDate(payload.record?.created_at ?? null);

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New user pending approval: ${email}`,
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#16243D">
  <p>A new user confirmed their email and is waiting for approval.</p>
  <p><strong>Email:</strong> ${email}<br/>
  <strong>Registered:</strong> ${registeredAt}</p>
  <p style="color:#53657A;font-size:13px">Approve them by setting <code>approved = true</code> on their row in the Supabase <code>profiles</code> table.</p>
</div>`,
      text: `A new user confirmed their email and is waiting for approval.\n\nEmail: ${email}\nRegistered: ${registeredAt}\n\nApprove them by setting approved = true on their row in the Supabase profiles table.`,
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    return NextResponse.json({ error: "resend request failed", detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true, notified: to, pending: email });
}
