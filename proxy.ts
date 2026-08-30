import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { USER_HEADER, encodeUserHeader } from "@/lib/session-header";

// Prefixes whose server components read the session (via getAccess()) or require
// approval. Everything else only needs the cheap inbound-header strip below.
// /intelligence and /news are open to visitors — the server masks their data for
// levels 0/1/2 — but still read the session, so they belong here.
const SESSION_PREFIXES = ["/intelligence", "/news", "/settings", "/pricing", "/admin"];
const PROTECTED_PREFIXES = ["/admin"];

export async function proxy(request: NextRequest) {
  // Forward the caller's headers to the app, minus any inbound USER_HEADER:
  // only this proxy may set it, and only from a token it just validated. The
  // matcher runs this on every request that can reach app code (everything bar
  // Next's own build assets), so the header can never be spoofed from outside
  // regardless of which route reads it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_HEADER);

  const passThrough = () => NextResponse.next({ request: { headers: requestHeaders } });

  const { pathname } = request.nextUrl;
  const needsSession = SESSION_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!needsSession) {
    // Homepage, /login, /api/*, RSC payloads for static routes, … — no auth
    // round trip, so these stay fast.
    return passThrough();
  }

  // supabase-js may hand us refreshed auth cookies mid-call (token rotation);
  // collect them and attach them to whichever response we return.
  const refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            refreshedCookies.push({ name, value, options });
          });
        },
      },
    }
  );

  // Touch the session so tokens stay fresh, and so getAccess() can trust
  // USER_HEADER instead of making the same getUser() call a second time.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    requestHeaders.set(USER_HEADER, encodeUserHeader(user));
  }

  const withContext = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    for (const { name, value, options } of refreshedCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  };

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("approved")
      .eq("id", user.id)
      .single();

    if (!profile?.approved) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return withContext();
}

export const config = {
  // Run on every path that can reach app code so the inbound USER_HEADER strip
  // is universal. Only Next's own build assets are excluded (`_next/static`,
  // `_next/image`, `favicon.ico`) — those are served before app code and never
  // read the header. Static files under /public (`*.svg`, `*.png`, …) are NOT
  // excluded any more: the strip must cover them too. The function early-returns
  // for any path outside SESSION_PREFIXES, so this is not a per-request auth cost.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
