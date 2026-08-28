import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  approved: boolean | null;
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

/**
 * Supabase Database Webhook target. Fires on profiles UPDATE; when a row flips
 * approved false -> true we email the user that they're approved.
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

  const approvedNow = payload.record?.approved === true;
  const approvedBefore = payload.old_record?.approved === true;

  // Only act on the false -> true transition on the profiles table.
  if (payload.table !== "profiles" || payload.type !== "UPDATE" || !approvedNow || approvedBefore) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const email = payload.record?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "approved row has no email" }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const from = process.env.RESEND_FROM || "PumpRadar24 <noreply@pumpradar24.com>";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://pumpradar24.com").replace(/\/$/, "");
  const loginUrl = `${siteUrl}/login`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your PumpRadar24 account is approved",
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#16243D">
  <p>Your account has been approved! You can now subscribe and access full data.</p>
  <p><a href="${loginUrl}" style="display:inline-block;background:#0B1830;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px">Sign in to PumpRadar24</a></p>
  <p style="color:#53657A;font-size:13px">${loginUrl}</p>
</div>`,
      text: `Your account has been approved! You can now subscribe and access full data.\n\nSign in: ${loginUrl}`,
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    return NextResponse.json({ error: "resend request failed", detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true, emailed: email });
}
