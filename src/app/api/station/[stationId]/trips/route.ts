import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";

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
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get("lineId");

    const trips = await db.trip.findMany({
      where: {
        line: { stationId },
        deletedAt: null,
        ...(lineId ? { lineId } : {}),
      },
      include: { line: true },
      orderBy: { departureTime: "asc" },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error("Erreur lors de la récupération des trajets:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des trajets." },
      { status: 500 }
    );
  }
}
