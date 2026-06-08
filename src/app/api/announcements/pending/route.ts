// ─── GET /api/announcements/pending?stationId=xxx ─────────────────────────────────
//
// Fetches the oldest pending announcement for the kiosk to play.
// Returns audio segment payloads (JSON) for the AutoAnnouncer.
// No auth required — kiosk is a public-facing display.
//

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");

    if (!stationId) {
      return NextResponse.json(
        { error: "stationId requis." },
        { status: 400 }
      );
    }

    // Fetch the oldest pending announcement with scheduledAt <= now, ordered by priority desc then scheduledAt asc
    const now = new Date();

    const announcement = await db.announcementQueue.findFirst({
      where: {
        stationId,
        status: "pending",
        scheduledAt: { lte: now },
      },
      orderBy: [
        { priority: "desc" },
        { scheduledAt: "asc" },
      ],
      select: {
        id: true,
        type: true,
        title: true,
        payload: true,
        renderedMessage: true,
        channel: true,
        priority: true,
      },
    });

    if (!announcement) {
      return NextResponse.json([]);
    }

    return NextResponse.json([announcement]);
  } catch (error) {
    console.error("[/api/announcements/pending] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
