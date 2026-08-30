import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Delete my account" from Settings. This does NOT delete anything — it flags
 * the profile (deletion_requested / deletion_requested_at) so an admin can do
 * the real removal by hand, and notifies the team. Once flagged the user is
 * locked out (getAccess() treats them as a visitor, login is blocked).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ deletion_requested: true, deletion_requested_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }

  // Best-effort admin notification — the flag is already set, so a mail failure
  // must not fail the request.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && user.email) {
    const from = process.env.RESEND_FROM || "PumpRadar24 <noreply@pumpradar24.com>";
    const to = process.env.ADMIN_NOTIFY_EMAIL || "dealers@pumpradar24.com";
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject: `Account deletion requested: ${user.email}`,
          html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#16243D">
  <p>A user requested deletion of their account and has been locked out.</p>
  <p><strong>Email:</strong> ${user.email}<br/>
  <strong>Requested:</strong> ${new Date().toISOString()}</p>
  <p style="color:#53657A;font-size:13px">Do the real removal in Supabase when ready (auth user + profiles row).</p>
</div>`,
          text: `A user requested deletion of their account and has been locked out.\n\nEmail: ${user.email}\nRequested: ${new Date().toISOString()}\n\nDo the real removal in Supabase when ready.`,
        }),
      });
    } catch {
      /* ignore — flag is set, admin can still see it in the table */
    }
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
