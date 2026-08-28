import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client for Client Components (auth forms, session checks). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
