import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { createAdCreativeSchema, updateAdCreativeSchema } from "@/lib/validations/schemas";

/**
 * GET /api/station/[stationId]/campaigns/[campaignId]/creatives
 * List creatives for a campaign.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string; campaignId: string }> }
) {
  try {
    const { campaignId } = await params;

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
 */
export async function POST(
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
