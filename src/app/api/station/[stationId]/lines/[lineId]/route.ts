import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; lineId: string }> }
): Promise<NextResponse> {
  const { stationId, lineId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const body = await request.json();

    // Check if the line belongs to this station
    const existingLine = await db.line.findFirst({
      where: { id: lineId, stationId, deletedAt: null },
    });

    if (!existingLine) {
      return NextResponse.json(
        { error: "Ligne non trouvée." },
        { status: 404 }
      );
    }

    // Build update data from allowed fields only
    const updateData: Record<string, unknown> = {};
    if (typeof body.name === "string") updateData.name = body.name;
    if (typeof body.code === "string") updateData.code = body.code;
    if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;

    const updatedLine = await db.line.update({
      where: { id: lineId },
      data: updateData,
    });

    revalidatePath(`/station/${stationId}/lines`);
    return NextResponse.json(updatedLine);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la ligne:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la ligne." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; lineId: string }> }
): Promise<NextResponse> {
  const { stationId, lineId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const existingLine = await db.line.findFirst({
      where: { id: lineId, stationId, deletedAt: null },
    });

    if (!existingLine) {
      return NextResponse.json(
        { error: "Ligne non trouvée." },
        { status: 404 }
      );
    }

    await db.line.update({
      where: { id: lineId },
      data: { deletedAt: new Date() },
    });

    revalidatePath(`/station/${stationId}/lines`);
    return NextResponse.json({ message: "Ligne supprimée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de la ligne:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la ligne." },
      { status: 500 }
    );
  }
}
