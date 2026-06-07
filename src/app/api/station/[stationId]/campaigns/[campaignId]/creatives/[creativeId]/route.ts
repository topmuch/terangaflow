import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateAdCreativeSchema } from "@/lib/validations/schemas";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";

/**
 * PATCH /api/station/[stationId]/campaigns/[campaignId]/creatives/[creativeId]
 * Update a creative.
 * REQUIRES AUTH + tenant isolation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string; creativeId: string }> }
) {
  try {
    const { stationId, campaignId, creativeId } = await params;

    // ─── AUTH + TENANT ISOLATION ──────────────────────────────────────────
    const auth = await requireAuth();
    if (!auth.success) return auth.error;

    const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
    if (accessError) return accessError;

    // Verify campaign belongs to station
    const campaign = await db.adCampaign.findFirst({
      where: { id: campaignId, stationId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

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
 * REQUIRES AUTH + tenant isolation.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string; creativeId: string }> }
) {
  try {
    const { stationId, campaignId, creativeId } = await params;

    // ─── AUTH + TENANT ISOLATION ──────────────────────────────────────────
    const auth = await requireAuth();
    if (!auth.success) return auth.error;

    const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
    if (accessError) return accessError;

    // Verify campaign belongs to station
    const campaign = await db.adCampaign.findFirst({
      where: { id: campaignId, stationId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

    await db.adCreative.delete({
      where: { id: creativeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE .../creatives/...] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
