import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase email-confirmation landing route (PKCE).
 * The "Confirm signup" email links here with a one-time `code`; we exchange it
 * for a session so the account's email is marked confirmed. Access to the app
 * still depends on the `profiles.approved` flag, enforced by proxy.ts.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectError = searchParams.get("error_description");

  if (redirectError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(redirectError)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/login?confirmed=1`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
