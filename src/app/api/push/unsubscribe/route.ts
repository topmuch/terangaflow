import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── POST /api/push/unsubscribe ──────────────────────────────────────────────
// Removes a push subscription from the database

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint requis" },
        { status: 400 }
      );
    }

    // Find and delete subscription
    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (!subscription) {
      return NextResponse.json({
        success: true,
        message: "Abonnement non trouvé (déjà supprimé)",
      });
    }

    await db.pushSubscription.delete({
      where: { endpoint },
    });

    return NextResponse.json({
      success: true,
      message: "Abonnement supprimé",
    });
  } catch (error) {
    console.error("[PUSH UNSUBSCRIBE] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors du désabonnement" },
      { status: 500 }
    );
  }
}
