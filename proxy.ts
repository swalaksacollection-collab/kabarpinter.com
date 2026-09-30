import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only routes that depend on the signed-in user. Deliberately NOT the public
// site: running auth on every page view would undo the caching/speed work.
// (`/redaksi/:path+` = sub-pages such as /redaksi/review, not the public
// /redaksi "Tim Redaksi" page.)
export const config = {
  matcher: ["/kontributor/:path*", "/redaksi/:path+", "/auth/:path*"],
};
