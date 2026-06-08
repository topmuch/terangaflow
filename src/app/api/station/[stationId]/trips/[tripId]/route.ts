import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { validateTransition } from "@/lib/tripStateMachine";
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide." },
        { status: 400 }
      );
    }

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
    const b = body as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};
    if (typeof b.platform === "string") updateData.platform = b.platform;
    if (typeof b.notes === "string") updateData.notes = b.notes;
    if (typeof b.operatorName === "string")
      updateData.operatorName = b.operatorName;
    if (typeof b.departureTime === "string") {
      const parsed = new Date(b.departureTime);
      if (!isNaN(parsed.getTime())) {
        updateData.departureTime = parsed;
      }
    }
    if (typeof b.estimatedArrival === "string") {
      const parsed = new Date(b.estimatedArrival);
      if (!isNaN(parsed.getTime())) {
        updateData.estimatedArrival = parsed;
      }
    }

    // ─── STATUS CHANGE: validate via state machine ────────────────────────
    if (typeof b.status === "string") {
      const newStatus = (b.status as string).toUpperCase();
      const validation = validateTransition(existingTrip.status, newStatus);

      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error ?? "Transition interdite." },
          { status: 409 }
        );
      }

      updateData.status = newStatus;

      // Log the transition
      await db.transitionLog.create({
        data: {
          tripId,
          stationId,
          fromStatus: existingTrip.status,
          toStatus: newStatus,
          triggeredBy: auth.user.id,
        },
      });
    }

    updateData.updatedAt = new Date();

    const updatedTrip = await db.trip.update({
      where: { id: tripId },
      data: updateData,
      include: { line: true },
    });

    revalidatePath(`/station/${stationId}/trips`);
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

    revalidatePath(`/station/${stationId}/trips`);
    return NextResponse.json({ message: "Trajet supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du trajet:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du trajet." },
      { status: 500 }
    );
  }
}
