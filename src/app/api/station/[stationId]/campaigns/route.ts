import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { createAdCampaignSchema } from "@/lib/validations/schemas";

/**
 * GET /api/station/[stationId]/campaigns
 * List all ad campaigns for a station.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params;

    const campaigns = await db.adCampaign.findMany({
      where: {
        stationId,
        deletedAt: null,
      },
      include: {
        creatives: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: {
            impressions: {
              where: { type: "impression" },
            },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    // Enrich with stats
    const enriched = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      advertiserName: c.advertiserName,
      targetingSlot: c.targetingSlot,
      priority: c.priority,
      budgetTotal: c.budgetTotal,
      budgetSpent: c.budgetSpent,
      cpmCost: c.cpmCost,
      cpcCost: c.cpcCost,
      maxImpressions: c.maxImpressions,
      status: c.status,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? null,
      creativeCount: c.creatives.length,
      impressionCount: c._count.impressions,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ campaigns: enriched });
  } catch (error) {
    console.error("[GET /api/station/.../campaigns] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/station/[stationId]/campaigns
 * Create a new ad campaign.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    // Auth check
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { stationId } = await params;
    const body = await request.json();

    // Validate
    const parsed = createAdCampaignSchema.safeParse({ ...body, stationId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const campaign = await db.adCampaign.create({
      data: {
        name: data.name,
        advertiserName: data.advertiserName,
        stationId: data.stationId,
        targetingSlot: data.targetingSlot,
        priority: data.priority,
        budgetTotal: data.budgetTotal,
        budgetSpent: data.budgetSpent,
        cpmCost: data.cpmCost,
        cpcCost: data.cpcCost,
        maxImpressions: data.maxImpressions ?? null,
        status: data.status,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/station/.../campaigns] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
