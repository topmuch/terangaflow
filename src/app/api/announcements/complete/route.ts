// ─── POST /api/announcements/complete ────────────────────────────────────────────
//
// Marks an announcement as completed (played) after the kiosk finishes playback.
// Body: { id: string }
// No auth required — kiosk is a public-facing display.
//

import { NextResponse } from "next/server";
import { completeAnnouncement } from "@/lib/notificationDispatcher";

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

    await completeAnnouncement(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur /api/announcements/complete:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
