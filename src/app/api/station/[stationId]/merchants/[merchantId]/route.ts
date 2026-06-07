import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { updateMerchantSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; merchantId: string }> }
): Promise<NextResponse> {
  const { stationId, merchantId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const merchant = await db.merchant.findFirst({
      where: { id: merchantId, stationId, deletedAt: null },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Partenaire non trouvé." },
        { status: 404 }
      );
    }

    return NextResponse.json(merchant);
  } catch (error) {
    console.error("Erreur lors de la récupération du partenaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du partenaire." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; merchantId: string }> }
): Promise<NextResponse> {
  const { stationId, merchantId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const existing = await db.merchant.findFirst({
      where: { id: merchantId, stationId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Partenaire non trouvé." },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Normalize empty strings to null
    if (body.whatsapp === "") body.whatsapp = null;
    if (body.mapsUrl === "") body.mapsUrl = null;
    if (body.promoExpiry === "") body.promoExpiry = null;

    const validated = updateMerchantSchema.parse(body);

    const updated = await db.merchant.update({
      where: { id: merchantId },
      data: {
        ...validated,
        whatsapp: validated.whatsapp === "" ? null : validated.whatsapp,
        mapsUrl: validated.mapsUrl === "" ? null : validated.mapsUrl,
        promoExpiry: validated.promoExpiry ? new Date(validated.promoExpiry) : null,
      },
    });

    revalidatePath(`/station/${stationId}/partners`);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Données invalides.", details: error.message },
        { status: 400 }
      );
    }
    console.error("Erreur lors de la modification du partenaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification du partenaire." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; merchantId: string }> }
): Promise<NextResponse> {
  const { stationId, merchantId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const existing = await db.merchant.findFirst({
      where: { id: merchantId, stationId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Partenaire non trouvé." },
        { status: 404 }
      );
    }

    await db.merchant.update({
      where: { id: merchantId },
      data: { deletedAt: new Date() },
    });

    revalidatePath(`/station/${stationId}/partners`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du partenaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du partenaire." },
      { status: 500 }
    );
  }
}
