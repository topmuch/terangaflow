import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/station/[stationId]/branding-public
 * Public endpoint — no auth required.
 * Returns station branding data for CSS variable injection on kiosk displays.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const station = await db.station.findFirst({
    where: { id: stationId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      brandName: true,
      brandColor: true,
      brandLogoUrl: true,
      brandFaviconUrl: true,
    },
  });

  if (!station) {
    return NextResponse.json(
      { error: "Gare non trouvée ou inactive." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    stationId: station.id,
    stationName: station.name,
    brandName: station.brandName,
    brandColor: station.brandColor,
    brandLogoUrl: station.brandLogoUrl,
    brandFaviconUrl: station.brandFaviconUrl,
  });
}
