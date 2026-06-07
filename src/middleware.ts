import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getDomainMapping } from "@/lib/domainCache";

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/display",          // Public kiosk display pages
  "/p",                // Public merchant landing pages
  "/pwa",              // PWA traveler app
  "/alerts",           // Alert subscription pages
  "/api/auth",
  "/api/public",
  "/api/departures",    // Public departures API
  "/api/ads",           // Public ad serving + tracking API
  "/api/push",          // Push subscription API (public opt-in)
  "/api/station",       // Station API routes (auth handled at route level)
  "/_next",
  "/favicon.ico",
  "/logo.svg",
  "/robots.txt",
  "/manifest.json",
  "/sw.js",
  "/icons/",
];

// Hostnames that should NOT be treated as custom domains
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

// The app's default domain (extracted from env or hardcoded for dev)
const DEFAULT_DOMAIN = process.env.NEXTAUTH_URL
  ? new URL(process.env.NEXTAUTH_URL).hostname
  : "localhost";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(publicPath + "/")
  );
}

function isLocalOrDefaultHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.includes(hostname) || hostname === DEFAULT_DOMAIN;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.nextUrl.hostname;

  // ─── Custom Domain Detection (check FIRST, before auth) ─────────────────
  // If the hostname is a custom domain, inject brand headers and rewrite to /display
  if (!isLocalOrDefaultHostname(hostname)) {
    const mapping = getDomainMapping(hostname);

    if (mapping) {
      const displayUrl = request.nextUrl.clone();

      // Rewrite to /display/[stationId]
      if (pathname === "/" || pathname === "") {
        displayUrl.pathname = `/display/${mapping.stationId}`;
      } else if (pathname.startsWith("/api/departures/")) {
        // Rewrite departures API calls to the correct station
        displayUrl.pathname = `/api/departures/${mapping.stationId}`;
      } else if (!pathname.startsWith("/display/")) {
        // Any other path: rewrite to the display page for this station
        displayUrl.pathname = `/display/${mapping.stationId}`;
      }
      // If path already starts with /display/ and is a custom domain,
      // let it pass through (might be the rewritten path already)

      const response = NextResponse.rewrite(displayUrl);

      // Inject brand headers for downstream use
      if (mapping.brandName) {
        response.headers.set("x-brand-name", mapping.brandName);
      }
      if (mapping.brandColor) {
        response.headers.set("x-brand-color", mapping.brandColor);
      }
      if (mapping.brandLogoUrl) {
        response.headers.set("x-brand-logo-url", mapping.brandLogoUrl);
      }
      if (mapping.brandFaviconUrl) {
        response.headers.set("x-brand-favicon-url", mapping.brandFaviconUrl);
      }
      response.headers.set("x-station-id", mapping.stationId);

      return response;
    }
    // Custom domain not found in cache → fall through to normal flow
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated → allow request (tenant isolation enforced at API/DB level)
  const response = NextResponse.next();

  // Add tenant headers for downstream use
  response.headers.set("x-tenant-id", token.tenantId as string);
  response.headers.set("x-user-role", token.role as string);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
