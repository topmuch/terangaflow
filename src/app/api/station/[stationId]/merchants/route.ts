import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { z } from "zod";
import { createMerchantSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

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
    const merchants = await db.merchant.findMany({
      where: { stationId, deletedAt: null },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(merchants);
  } catch (error) {
    console.error("Erreur lors de la récupération des partenaires:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des partenaires." },
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

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const body = await request.json();

    // Normalize empty strings to undefined for optional fields
    if (body.whatsapp === "") body.whatsapp = undefined;
    if (body.mapsUrl === "") body.mapsUrl = undefined;

    const validated = createMerchantSchema.parse(body);

    const merchant = await db.merchant.create({
      data: {
        name: validated.name,
        description: validated.description,
        category: validated.category,
        whatsapp: validated.whatsapp,
        mapsUrl: validated.mapsUrl,
        promoText: validated.promoText,
        promoExpiry: validated.promoExpiry ? new Date(validated.promoExpiry) : undefined,
        logo: validated.logo,
        isActive: validated.isActive,
        displayOrder: validated.displayOrder,
        stationId,
      },
    });

    revalidatePath(`/station/${stationId}/partners`);
    return NextResponse.json(merchant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Données invalides." },
        { status: 400 }
      );
    }
    console.error("Erreur lors de la création du partenaire:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du partenaire." },
      { status: 500 }
    );
  }
}
