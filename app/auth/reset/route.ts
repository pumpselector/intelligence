import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Password-recovery landing route (PKCE), sibling of /auth/callback.
 *
 * `resetPasswordForEmail` (see /forgot-password) points its redirect here. The
 * email link carries a one-time `code`; we exchange it for a session so the
 * signed-in user can set a new password on /reset-password. The PKCE
 * `code_verifier` cookie was written in the browser when the reset was
 * requested, so the exchange works as long as the link is opened in the same
 * browser.
 *
 * Any failure (stale code from mail-scanner prefetch, expired link, wrong
 * browser) sends the user to /reset-password?error=1, which shows a
 * "request a new link" message instead of a raw error.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const errorCode = searchParams.get("error_code") || searchParams.get("error");

  if (errorCode || !code) {
    return NextResponse.redirect(`${origin}/reset-password?error=1`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(
    error ? `${origin}/reset-password?error=1` : `${origin}/reset-password`
  );
}
