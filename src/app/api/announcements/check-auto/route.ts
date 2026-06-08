// ─── POST /api/announcements/check-auto?stationId=xxx ───────────────────────────
//
// Triggers the automatic time-based scheduler:
//   - Checks departure times vs current time
//   - Auto-transitions: scheduled→boarding→departure_imminent→departed
//   - Enqueues PA announcements (ding-dong + TTS)
//   - Sends periodic reminders (baggage every 45min, valuables every 90min)
//
// Called by the Kiosk AutoAnnouncer on every poll cycle (every 3s).
// The scheduler itself is idempotent — announcements are created only once per day per key.
// No auth required — kiosk is a public-facing display.
//

import { NextResponse } from "next/server";
import { checkAndTriggerAutomatedAnnouncements } from "@/lib/autoScheduler";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");

    if (!stationId) {
      return NextResponse.json(
        { error: "stationId requis." },
        { status: 400 }
      );
    }

    // Run the automatic scheduler (idempotent)
    const result = await checkAndTriggerAutomatedAnnouncements(stationId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[/api/announcements/check-auto] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
