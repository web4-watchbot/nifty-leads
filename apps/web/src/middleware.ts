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
    const sessionToken = req.cookies.get("better-auth.session_token")?.value;
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
