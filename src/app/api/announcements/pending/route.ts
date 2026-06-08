// ─── GET /api/announcements/pending?stationId=xxx ─────────────────────────────────
//
// Fetches pending announcements due for playback on the kiosk display.
// Returns audio segment payloads (JSON) for the AutoAnnouncer to play.
// No auth required — kiosk is a public-facing display.
//

import { NextResponse } from "next/server";
import { fetchDueAnnouncements } from "@/lib/notificationDispatcher";

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

    const items = await fetchDueAnnouncements(stationId);

    return NextResponse.json(items);
  } catch (error) {
    console.error("Erreur /api/announcements/pending:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
