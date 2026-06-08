// ─── Auto Scheduler ───────────────────────────────────────────────────────────────
//
// AUTOMATIC TIME-BASED ANNOUNCEMENT SYSTEM (Zero-Click)
//
// This module checks scheduled departure times vs current time and
// automatically transitions trip statuses + enqueues PA announcements.
// No user interaction needed. Called by /api/announcements/check-auto.
//
// RULES (hardcoded, no DB configuration):
//   - T-15min : scheduled → boarding + boarding announcement
//   - T-2min  : boarding → departure_imminent + imminent announcement
//   - H+1min  : (any) → departed + departed announcement
//   - Every 45min : baggage security reminder
//   - Every 90min : valuables security reminder
//

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────────

type AudioSegment = { type: "mp3"; src: string } | { type: "tts"; text: string };

// ─── Core Scheduler ──────────────────────────────────────────────────────────────

export async function checkAndTriggerAutomatedAnnouncements(stationId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  console.log(`[autoScheduler] 🔄 Checking station ${stationId} at ${now.toISOString()}`);

  let triggeredCount = 0;

  // ═══ 1. AUTOMATIC REMINDERS (Hardcoded Schedule) ═══════════════════════════════
  const currentMinute = now.getMinutes();

  // Baggage reminder: every 45 min (at minute 0 and 45)
  if (currentMinute === 0 || currentMinute === 45) {
    const created = await createAnnouncementIfNotExists(
      stationId,
      "reminder_baggage",
      [
        { type: "mp3", src: "/audio/ding-dong.mp3" },
        { type: "mp3", src: "/audio/rappel_bagages.mp3" },
      ],
      todayStart
    );
    if (created) triggeredCount++;
  }

  // Valuables reminder: every 90 min (at minute 0 of every even hour)
  if (currentMinute === 0 && now.getHours() % 2 === 0) {
    const created = await createAnnouncementIfNotExists(
      stationId,
      "reminder_valuables",
      [
        { type: "mp3", src: "/audio/ding-dong.mp3" },
        { type: "mp3", src: "/audio/rappel_valeurs.mp3" },
      ],
      todayStart
    );
    if (created) triggeredCount++;
  }

  // ═══ 2. TRIP DEPARTURE LIFECYCLE (Time-based) ══════════════════════════════════
  // Fetch upcoming trips within a ±20min window
  const upcomingTrips = await db.trip.findMany({
    where: {
      line: { stationId },
      status: { in: ["scheduled", "boarding", "delayed"] },
      departureTime: {
        gte: new Date(now.getTime() - 5 * 60 * 1000),  // -5 min margin
        lte: new Date(now.getTime() + 20 * 60 * 1000), // +20 min ahead
      },
    },
    include: { line: true },
    orderBy: { departureTime: "asc" },
  });

  console.log(`[autoScheduler] 📋 Found ${upcomingTrips.length} upcoming trip(s)`);

  for (const trip of upcomingTrips) {
    const timeDiffMs = trip.departureTime.getTime() - now.getTime();
    const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));

    const destination = trip.line.name;
    const platform = trip.platform || "à déterminer";

    // ── T-15min : Embarquement (scheduled → boarding) ────────────────────
    if (
      timeDiffMinutes <= 15 &&
      timeDiffMinutes > 10 &&
      trip.status === "scheduled"
    ) {
      await db.trip.update({
        where: { id: trip.id },
        data: { status: "boarding" },
      });

      const created = await createAnnouncementIfNotExists(
        stationId,
        `board_${trip.id}`,
        [
          { type: "mp3", src: "/audio/ding-dong.mp3" },
          { type: "tts", text: `Le bus à destination de ${destination} est en cours d'embarquement au quai ${platform}.` },
        ],
        todayStart
      );

      if (created) {
        triggeredCount++;
        console.log(`[autoScheduler] ✅ BOARDING: ${destination} (T-${timeDiffMinutes}min)`);
      }
    }

    // ── T-2min : Départ Imminent (boarding → departure_imminent) ─────────
    if (
      timeDiffMinutes <= 2 &&
      timeDiffMinutes >= 0 &&
      (trip.status === "boarding" || trip.status === "delayed")
    ) {
      await db.trip.update({
        where: { id: trip.id },
        data: { status: "departure_imminent" },
      });

      const created = await createAnnouncementIfNotExists(
        stationId,
        `imminent_${trip.id}`,
        [
          { type: "mp3", src: "/audio/ding-dong.mp3" },
          { type: "tts", text: `Dernier appel. Le bus pour ${destination} va partir dans 2 minutes. Quai ${platform}.` },
        ],
        todayStart
      );

      if (created) {
        triggeredCount++;
        console.log(`[autoScheduler] ✅ DEPARTURE_IMMINENT: ${destination} (T-${timeDiffMinutes}min)`);
      }
    }

    // ── H+1min : Parti (anything → departed) ────────────────────────────
    if (
      timeDiffMinutes < -1 &&
      trip.status !== "departed" &&
      trip.status !== "cancelled"
    ) {
      await db.trip.update({
        where: { id: trip.id },
        data: { status: "departed" },
      });

      const created = await createAnnouncementIfNotExists(
        stationId,
        `departed_${trip.id}`,
        [
          { type: "mp3", src: "/audio/ding-dong.mp3" },
          { type: "tts", text: `Le bus à destination de ${destination} vient de partir. Bon voyage !` },
        ],
        todayStart
      );

      if (created) {
        triggeredCount++;
        console.log(`[autoScheduler] ✅ DEPARTED: ${destination}`);
      }
    }
  }

  console.log(`[autoScheduler] 📢 ${triggeredCount} announcement(s) triggered`);
  return { triggeredCount };
}

// ─── Helper: Create announcement only if not already created today ────────────────

async function createAnnouncementIfNotExists(
  stationId: string,
  uniqueKey: string,
  payload: AudioSegment[],
  todayStart: Date
): Promise<boolean> {
  const exists = await db.announcementQueue.findFirst({
    where: {
      stationId,
      type: uniqueKey,
      createdAt: { gte: todayStart },
    },
  });

  if (exists) return false;

  await db.announcementQueue.create({
    data: {
      stationId,
      type: uniqueKey,
      status: "pending",
      channel: "VOCAL_PA",
      scheduledAt: new Date(),
      payload: JSON.stringify(payload),
      title: uniqueKey,
      priority: uniqueKey.startsWith("manual_") ? 150 : 50,
    },
  });

  return true;
}
