import { createClient } from "@supabase/supabase-js";

// Cookie-free Supabase client for PUBLIC reads (published articles,
// categories). Unlike createServerClient() in ./server.ts it never calls
// cookies(), so pages using it stay statically renderable and honour their
// `revalidate` (ISR) instead of being forced dynamic on every request.
//
// Anonymous visitors and logged-in users see the same published rows here
// (RLS only exposes status='published' to everyone), so no session is needed.
// Anything that depends on the signed-in user (contributor dashboard,
// editor review queue) must keep using createServerClient().
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
