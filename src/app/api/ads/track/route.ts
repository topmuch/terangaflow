import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/ads/track
 *
 * Transactional tracking endpoint for impressions and clicks.
 * Uses sendBeacon on the client for non-blocking tracking.
 *
 * Supports both a `token` field (base64url-encoded payload) or explicit fields.
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      return NextResponse.json(
        { error: "Content-Type non supporté" },
        { status: 415 }
      );
    }

    // Decode from tracking token if provided (base64url)
    if (typeof body.token === "string" && body.token.length > 0) {
      try {
        const payload = JSON.parse(
          Buffer.from(body.token, "base64url").toString("utf-8")
        );
        body = { ...body, ...payload };
      } catch {
        // token decode failed — continue with explicit fields
      }
    }

    const campaignId = body.campaignId as string | undefined;
    const creativeId = body.creativeId as string | undefined;
    const stationId = body.stationId as string | undefined;
    const type = (body.type as string) ?? "impression";
    const slotType = body.slotType as string | undefined;
    const sessionId = (body.sessionId as string) ?? undefined;
    const userAgent = (body.userAgent as string) ?? undefined;
    const referrer = (body.referrer as string) ?? undefined;

    if (!campaignId || !creativeId || !stationId || !slotType) {
      return NextResponse.json(
        { error: "Champs requis: campaignId, creativeId, stationId, slotType" },
        { status: 400 }
      );
    }

    if (type !== "impression" && type !== "click") {
      return NextResponse.json(
        { error: "Type invalide. Valeurs: impression, click" },
        { status: 400 }
      );
    }

    const validSlots = ["header", "insert", "sidebar", "interstitial"];
    if (!validSlots.includes(slotType)) {
      return NextResponse.json(
        { error: "SlotType invalide" },
        { status: 400 }
      );
    }

    // Record the impression/click event
    await db.adImpression.create({
      data: {
        campaignId,
        creativeId,
        stationId,
        type,
        slotType,
        sessionId,
        userAgent,
        referrer,
      },
    });

    // Update campaign budget spent
    const campaign = await db.adCampaign.findUnique({
      where: { id: campaignId },
    });

    let costIncrement = 0;
    if (campaign) {
      if (type === "impression" && campaign.cpmCost > 0) {
        costIncrement = campaign.cpmCost / 1000;
      } else if (type === "click" && campaign.cpcCost > 0) {
        costIncrement = campaign.cpcCost;
      }

      if (costIncrement > 0) {
        const newSpent = campaign.budgetSpent + costIncrement;
        const isExhausted = campaign.budgetTotal > 0 && newSpent >= campaign.budgetTotal;

        await db.adCampaign.update({
          where: { id: campaignId },
          data: {
            budgetSpent: newSpent,
            ...(isExhausted ? { status: "exhausted" } : {}),
          },
        });
      }
    }

    return NextResponse.json({ success: true, budgetSpent: costIncrement });
  } catch (error) {
    // Return 200 even on error — tracking should never block UI
    return NextResponse.json({ success: false, error: "track_failed" });
  }
}
