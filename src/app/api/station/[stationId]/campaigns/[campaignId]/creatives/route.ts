import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdCreativeSchema, updateAdCreativeSchema } from "@/lib/validations/schemas";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";

/**
 * GET /api/station/[stationId]/campaigns/[campaignId]/creatives
 * List creatives for a campaign.
 * REQUIRES AUTH + tenant isolation.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string }> }
) {
  try {
    const { stationId, campaignId } = await params;

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

    const creatives = await db.adCreative.findMany({
      where: { campaignId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json({ creatives });
  } catch (error) {
    console.error("[GET .../creatives] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/station/[stationId]/campaigns/[campaignId]/creatives
 * Create a creative for a campaign.
 * REQUIRES AUTH + tenant isolation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string }> }
) {
  try {
    const { stationId, campaignId } = await params;

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

    const parsed = createAdCreativeSchema.safeParse({ ...body, campaignId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const creative = await db.adCreative.create({
      data: {
        campaignId: data.campaignId,
        title: data.title,
        body: data.body ?? null,
        imageUrl: data.imageUrl ?? null,
        linkUrl: data.linkUrl && data.linkUrl !== "" ? data.linkUrl : null,
        ctaText: data.ctaText,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      },
    });

    return NextResponse.json({ creative }, { status: 201 });
  } catch (error) {
    console.error("[POST .../creatives] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
