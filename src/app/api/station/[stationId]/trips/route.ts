import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { lineId, operatorName, departureTime, estimatedArrival, platform, notes } = body as {
      lineId: string;
      operatorName: string;
      departureTime: string;
      estimatedArrival: string;
      platform?: string | null;
      notes?: string | null;
    };

    if (!lineId || !operatorName || !departureTime || !estimatedArrival) {
      return NextResponse.json(
        { error: "lineId, operatorName, departureTime et estimatedArrival sont requis." },
        { status: 400 }
      );
    }

    // Verify the line belongs to this station
    const line = await db.line.findFirst({
      where: { id: lineId, stationId },
    });
    if (!line) {
      return NextResponse.json(
        { error: "Ligne introuvable pour cette gare." },
        { status: 404 }
      );
    }

    const trip = await db.trip.create({
      data: {
        lineId,
        operatorName,
        departureTime: new Date(departureTime),
        estimatedArrival: new Date(estimatedArrival),
        platform: platform ?? null,
        notes: notes ?? null,
        status: "scheduled",
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du trajet:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du trajet." },
      { status: 500 }
    );
  }
}

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
