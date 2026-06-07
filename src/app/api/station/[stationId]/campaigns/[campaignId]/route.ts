import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { updateAdCampaignSchema } from "@/lib/validations/schemas";
import { getCampaignStats } from "@/lib/adEngine";

/**
 * GET /api/station/[stationId]/campaigns/[campaignId]
 * Get a single campaign with stats.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string }> }
) {
  try {
    const { campaignId } = await params;

    const campaign = await db.adCampaign.findUnique({
      where: { id: campaignId },
      include: {
        creatives: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: {
            impressions: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
    }

    const stats = await getCampaignStats(campaignId);

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        advertiserName: campaign.advertiserName,
        targetingSlot: campaign.targetingSlot,
        priority: campaign.priority,
        budgetTotal: campaign.budgetTotal,
        budgetSpent: campaign.budgetSpent,
        cpmCost: campaign.cpmCost,
        cpcCost: campaign.cpcCost,
        maxImpressions: campaign.maxImpressions,
        status: campaign.status,
        startDate: campaign.startDate.toISOString(),
        endDate: campaign.endDate?.toISOString() ?? null,
        creatives: campaign.creatives.map((c) => ({
          id: c.id,
          title: c.title,
          body: c.body,
          imageUrl: c.imageUrl,
          linkUrl: c.linkUrl,
          ctaText: c.ctaText,
          displayOrder: c.displayOrder,
          isActive: c.isActive,
        })),
        stats,
      },
    });
  } catch (error) {
    console.error("[GET /api/station/.../campaigns/...] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH /api/station/[stationId]/campaigns/[campaignId]
 * Update a campaign.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string }> }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { campaignId } = await params;
    const body = await request.json();

    // Validate
    const parsed = updateAdCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Convert date strings to Date objects
    const updateData: Record<string, unknown> = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined && data.endDate !== null) {
      updateData.endDate = new Date(data.endDate);
    } else if (data.endDate === null) {
      updateData.endDate = null;
    }

    const campaign = await db.adCampaign.update({
      where: { id: campaignId },
      data: updateData,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[PATCH /api/station/.../campaigns/...] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/station/[stationId]/campaigns/[campaignId]
 * Soft-delete a campaign.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string }> }
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { campaignId } = await params;

    await db.adCampaign.update({
      where: { id: campaignId },
      data: { deletedAt: new Date(), status: "completed" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/station/.../campaigns/...] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
