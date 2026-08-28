import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase email-confirmation landing route (PKCE).
 *
 * The "Confirm signup" email links here with a one-time `code`. We exchange it
 * for a session so the user is auto signed-in. Note the email address itself is
 * already marked confirmed by Supabase's /verify step BEFORE this redirect — so
 * even if the exchange here fails, the user can still sign in manually.
 *
 * Known failure: some mail providers (Gmail, Outlook) pre-open links for
 * security scanning, which consumes the one-time code / PKCE flow state. The
 * real click then lands here with a stale code and `exchangeCodeForSession`
 * returns "invalid flow state, flow state has expired". We treat that as a soft
 * error and send the user to /login with a plain-language notice instead of the
 * raw message — they can just sign in, or request a fresh confirmation email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const errorCode = searchParams.get("error_code") || searchParams.get("error");

  // Supabase /verify already rejected the token (expired / already used).
  if (errorCode) {
    return NextResponse.redirect(`${origin}/login?notice=link_expired`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/login?confirmed=1`);
    }

    // Stale / already-consumed code (typically link pre-fetching). Not fatal.
    return NextResponse.redirect(`${origin}/login?notice=link_used`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
