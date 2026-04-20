import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================
// Middleware — Custom domain white-label routing
// ONLY activates for *.smartticketqr.com subdomains
// All other requests (including direct IP access) pass through normally.
// NO Prisma — runs in Edge Runtime, which is incompatible with Prisma.
// ============================================================

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0];

  // Only activate for *.smartticketqr.com subdomains (custom domains)
  // Direct IP access, localhost, and all other hosts pass through
  if (!host.endsWith(".smartticketqr.com")) {
    return NextResponse.next();
  }

  // White Label domain routing — rewrite to display page with domain as query param
  const displayUrl = new URL(`/display?domain=${encodeURIComponent(host)}`, request.url);
  const response = NextResponse.rewrite(displayUrl);
  response.headers.set("x-white-label", "true");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-|api/|display).*)",
  ],
};
