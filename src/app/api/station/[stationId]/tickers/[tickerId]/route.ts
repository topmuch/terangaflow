import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { updateTickerSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; tickerId: string }> }
): Promise<NextResponse> {
  const { stationId, tickerId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const body = await request.json();

    // Check if the ticker belongs to this station
    const existingTicker = await db.tickerMessage.findFirst({
      where: { id: tickerId, stationId, deletedAt: null },
    });

    if (!existingTicker) {
      return NextResponse.json(
        { error: "Message non trouvé." },
        { status: 404 }
      );
    }

    // Validate with Zod (all fields optional in updateTickerSchema)
    const validated = updateTickerSchema.parse(body);

    const updatedTicker = await db.tickerMessage.update({
      where: { id: tickerId },
      data: validated,
    });

    revalidatePath(`/station/${stationId}/tickers`);
    return NextResponse.json(updatedTicker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides." },
        { status: 400 }
      );
    }
    console.error("Erreur lors de la mise à jour du message:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du message." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; tickerId: string }> }
): Promise<NextResponse> {
  const { stationId, tickerId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const existingTicker = await db.tickerMessage.findFirst({
      where: { id: tickerId, stationId, deletedAt: null },
    });

    if (!existingTicker) {
      return NextResponse.json(
        { error: "Message non trouvé." },
        { status: 404 }
      );
    }

    await db.tickerMessage.update({
      where: { id: tickerId },
      data: { deletedAt: new Date() },
    });

    revalidatePath(`/station/${stationId}/tickers`);
    return NextResponse.json({ message: "Message supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression du message:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du message." },
      { status: 500 }
    );
  }
}
