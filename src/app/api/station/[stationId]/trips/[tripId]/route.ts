import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; tripId: string }> }
): Promise<NextResponse> {
  const { stationId, tripId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const body = await request.json();

    // Verify the trip belongs to a line within this station
    const existingTrip = await db.trip.findFirst({
      where: {
        id: tripId,
        line: { stationId },
        deletedAt: null,
      },
      include: { line: true },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trajet non trouvé." },
        { status: 404 }
      );
    }

    // Build update data from allowed fields only
    const updateData: Record<string, unknown> = {};
    if (typeof body.status === "string") updateData.status = body.status;
    if (typeof body.platform === "string") updateData.platform = body.platform;
    if (typeof body.notes === "string") updateData.notes = body.notes;
    if (typeof body.operatorName === "string")
      updateData.operatorName = body.operatorName;
    if (typeof body.departureTime === "string") {
      const parsed = new Date(body.departureTime);
      if (!isNaN(parsed.getTime())) {
        updateData.departureTime = parsed;
      }
    }
    if (typeof body.estimatedArrival === "string") {
      const parsed = new Date(body.estimatedArrival);
      if (!isNaN(parsed.getTime())) {
        updateData.estimatedArrival = parsed;
      }
    }

    const updatedTrip = await db.trip.update({
      where: { id: tripId },
      data: updateData,
      include: { line: true },
    });

    revalidatePath(`/dashboard/${stationId}`);
    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du trajet:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du trajet." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; tripId: string }> }
): Promise<NextResponse> {
  const { stationId, tripId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const existingTrip = await db.trip.findFirst({
      where: {
        id: tripId,
        line: { stationId },
        deletedAt: null,
      },
    });

    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trajet non trouvé." },
        { status: 404 }
      );
    }

    await db.trip.update({
      where: { id: tripId },
      data: { deletedAt: new Date() },
    });

    revalidatePath(`/dashboard/${stationId}`);
    return NextResponse.json({ message: "Trajet supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du trajet:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du trajet." },
      { status: 500 }
    );
  }
}
