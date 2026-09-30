import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/application";

// Landing point of the DEFAULT Supabase magic-link email (PKCE flow):
// Supabase sends the user back here with "?code=...", which we exchange for
// a session cookie.
//
// Limitation: PKCE needs the code verifier stored in the browser that
// REQUESTED the link, so the link must be opened in that same browser.
// Once a custom SMTP server is configured and the email templates can be
// edited, point them at /auth/confirm (token_hash flow) instead, which also
// works when the link opens in another browser or an in-app viewer.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/kontributor/masuk?error=link", request.url));
}
