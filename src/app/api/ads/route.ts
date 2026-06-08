import { NextRequest, NextResponse } from "next/server";
import { serveAd } from "@/lib/adEngine";
import type { SlotType } from "@/lib/adEngine";

/**
 * GET /api/ads?stationId=xxx&slot=insert&sessionId=yyy
 *
 * Public endpoint for the kiosk display to fetch an ad.
 * Returns the best matching creative for the given station + slot.
 * The `trackingToken` is a base64url-encoded payload for sendBeacon.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");
    const slotParam = searchParams.get("slot");
    const sessionId = searchParams.get("sessionId");

    if (!stationId || !slotParam) {
      return NextResponse.json(
        { error: "Paramètres manquants: stationId, slot" },
        { status: 400 }
      );
    }

    const validSlots: SlotType[] = ["header", "insert", "sidebar", "interstitial"];
    if (!validSlots.includes(slotParam as SlotType)) {
      return NextResponse.json(
        { error: "Slot invalide. Valeurs: header, insert, sidebar, interstitial" },
        { status: 400 }
      );
    }

    const result = await serveAd(
      stationId,
      slotParam as SlotType,
      sessionId ?? undefined
    );

    // No eligible ads — return fallback signal
    if (!result) {
      return NextResponse.json({ ad: null, fallback: true });
    }

    return NextResponse.json({
      ad: {
        id: result.creative.id,
        campaignId: result.creative.campaignId,
        campaignName: result.creative.campaignName,
        advertiserName: result.creative.advertiserName,
        title: result.creative.title,
        body: result.creative.body,
        imageUrl: result.creative.imageUrl,
        linkUrl: result.creative.linkUrl,
        ctaText: result.creative.ctaText,
        trackingToken: result.trackingToken,
      },
      fallback: false,
    });
  } catch (error) {
    console.error("[GET /api/ads] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
