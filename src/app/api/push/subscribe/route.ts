import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── POST /api/push/subscribe ────────────────────────────────────────────────
// Registers a push subscription in the database

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, keys, stationId, userAgent } = body;

    // Validate required fields
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Champs requis manquants: endpoint, keys.p256dh, keys.auth" },
        { status: 400 }
      );
    }

    // Upsert subscription (update if endpoint already exists)
    const subscription = await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        stationId: stationId || null,
        userAgent: userAgent || null,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        stationId: stationId || null,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error("[PUSH SUBSCRIBE] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'enregistrement de l'abonnement" },
      { status: 500 }
    );
  }
}

// ─── GET /api/push/subscribe ─────────────────────────────────────────────────
// Returns subscription count for a station (useful for admin dashboard)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");

    const where = stationId ? { stationId } : {};
    const count = await db.pushSubscription.count({ where });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[PUSH SUBSCRIBE GET] Error:", error);
    return NextResponse.json({ count: 0 });
  }
}
