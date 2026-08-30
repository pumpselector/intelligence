import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pull the bare address out of a "Name <addr@x>" or plain "addr@x" string. */
function bareAddress(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  const addr = (match ? match[1] : value).trim();
  return addr.includes("@") ? addr : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: { subject?: unknown; message?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  // Signed-in users are identified by their session; visitors supply their own
  // address in the public /contact form.
  const providedEmail = typeof body.email === "string" ? body.email.trim() : "";
  const senderEmail = user?.email ?? providedEmail;
  if (!EMAIL_RE.test(senderEmail)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 422 });
  }

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 422 });
  }
  if (subject.length > 200 || message.length > 1000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email is not configured." }, { status: 500 });
  }

  const from = process.env.RESEND_FROM || "PumpRadar24 <dealers@pumpradar24.com>";
  const to = bareAddress(process.env.CONTACT_TO) || bareAddress(from) || "dealers@pumpradar24.com";

  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: senderEmail,
      subject: `[Contact] ${subject}`,
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#16243D">
  <p><strong>From:</strong> ${escaped(senderEmail)}${user ? "" : " (not signed in)"}</p>
  <p><strong>Subject:</strong> ${escaped(subject)}</p>
  <hr style="border:none;border-top:1px solid #DCE6ED" />
  <p style="white-space:pre-wrap">${escaped(message)}</p>
</div>`,
      text: `From: ${senderEmail}${user ? "" : " (not signed in)"}\nSubject: ${subject}\n\n${message}`,
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    return NextResponse.json({ error: "Could not send your message.", detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
