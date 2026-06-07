import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { updateAdCreativeSchema } from "@/lib/validations/schemas";

/**
 * PATCH /api/station/[stationId]/campaigns/[campaignId]/creatives/[creativeId]
 * Update a creative.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string; creativeId: string }> }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { creativeId } = await params;
    const body = await request.json();

    const parsed = updateAdCreativeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = { ...data };

    // Normalize empty strings to null for optional URL fields
    if (data.linkUrl !== undefined && data.linkUrl !== null && data.linkUrl === "") {
      updateData.linkUrl = null;
    }
    if (data.imageUrl !== undefined && data.imageUrl !== null && data.imageUrl === "") {
      updateData.imageUrl = null;
    }
    if (data.body !== undefined && data.body !== null && data.body === "") {
      updateData.body = null;
    }

    const creative = await db.adCreative.update({
      where: { id: creativeId },
      data: updateData,
    });

    return NextResponse.json({ creative });
  } catch (error) {
    console.error("[PATCH .../creatives/...] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/station/[stationId]/campaigns/[campaignId]/creatives/[creativeId]
 * Delete a creative.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string; creativeId: string }> }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { creativeId } = await params;

    await db.adCreative.delete({
      where: { id: creativeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE .../creatives/...] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
