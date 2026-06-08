// ─── POST /api/announcements/mark-played ────────────────────────────────────────
//
// Called by the Kiosk AutoAnnouncer after successfully playing an announcement.
// Marks the announcement as "completed" in the DB so it won't be replayed.
// No auth required — kiosk is a public-facing display.
//
// Body: { id: string }
//

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id de l'annonce requis." },
        { status: 400 }
      );
    }

    // Verify the announcement exists
    const existing = await db.announcementQueue.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Annonce non trouvée." },
        { status: 404 }
      );
    }

    // Mark as completed
    await db.announcementQueue.update({
      where: { id },
      data: {
        status: "completed",
        playedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[mark-played] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
