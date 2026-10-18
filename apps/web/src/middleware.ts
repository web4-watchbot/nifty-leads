/**
 * Middleware: protect /admin routes (SPEC Section 8).
 * Unauthenticated users are redirected to login; role checks happen
 * server-side in the admin layout.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    // better-auth prefixes the cookie with `__Secure-` on HTTPS (production);
    // plain name is used on http://localhost in dev. Presence-only check —
    // session validity and the admin role are enforced in admin/layout.tsx.
    const sessionToken =
      req.cookies.get("__Secure-better-auth.session_token")?.value ??
      req.cookies.get("better-auth.session_token")?.value;
    if (!sessionToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("message", "admin-only");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
