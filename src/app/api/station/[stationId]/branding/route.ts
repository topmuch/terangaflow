import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const station = await db.station.findFirst({
      where: { id: stationId, deletedAt: null },
      select: {
        brandName: true,
        brandColor: true,
        brandLogoUrl: true,
        brandFaviconUrl: true,
        customDomain: true,
      },
    });

    if (!station) {
      return NextResponse.json(
        { error: "Gare non trouvée." },
        { status: 404 }
      );
    }

    return NextResponse.json(station);
  } catch (error) {
    console.error("Erreur lors de la récupération du branding:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du branding." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  if (!["SUPERADMIN", "STATION_MANAGER"].includes(auth.user.role)) {
    return NextResponse.json(
      { error: "Accès refusé. Rôle insuffisant." },
      { status: 403 }
    );
  }

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const body = await request.json();

    // Validate color is hex format if provided
    if (body.brandColor !== undefined && body.brandColor !== null && body.brandColor !== "") {
      if (!HEX_COLOR_REGEX.test(body.brandColor)) {
        return NextResponse.json(
          { error: "La couleur doit être au format hexadécimal (ex: #f59e0b)." },
          { status: 400 }
        );
      }
    }

    // Build update data with only provided fields
    const updateData: Record<string, string | null> = {};
    if ("brandName" in body) updateData.brandName = body.brandName || null;
    if ("brandColor" in body) updateData.brandColor = body.brandColor || null;
    if ("brandLogoUrl" in body) updateData.brandLogoUrl = body.brandLogoUrl || null;
    if ("brandFaviconUrl" in body) updateData.brandFaviconUrl = body.brandFaviconUrl || null;
    if ("customDomain" in body) updateData.customDomain = body.customDomain || null;

    const station = await db.station.update({
      where: { id: stationId },
      data: updateData,
      select: {
        brandName: true,
        brandColor: true,
        brandLogoUrl: true,
        brandFaviconUrl: true,
        customDomain: true,
      },
    });

    return NextResponse.json(station);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du branding:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du branding." },
      { status: 500 }
    );
  }
}
