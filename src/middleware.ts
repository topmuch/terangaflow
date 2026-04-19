import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // White Label domain routing
  // Skip for localhost and known platforms
  if (
    hostname !== "localhost:3000" &&
    !hostname.includes("vercel.app") &&
    !hostname.includes(".onrender.com") &&
    !hostname.startsWith("127.0.0.1")
  ) {
    try {
      const station = await db.station.findFirst({
        where: { customDomain: hostname, isActive: true },
        select: {
          id: true,
          brandColor: true,
          brandLogo: true,
          companyName: true,
          isWhiteLabel: true,
        },
      });

      if (station && station.isWhiteLabel) {
        // Rewrite to display page with station ID
        const displayUrl = new URL(`/display/${station.id}`, request.url);
        const response = NextResponse.rewrite(displayUrl);

        // Inject branding via response headers for client-side consumption
        response.headers.set("x-brand-color", station.brandColor);
        response.headers.set("x-brand-logo", station.brandLogo || "");
        response.headers.set("x-company-name", station.companyName);
        response.headers.set("x-white-label", "true");

        return response;
      }
    } catch {
      // DB query failed, fall through to normal routing
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-|api/).*)",
  ],
};
