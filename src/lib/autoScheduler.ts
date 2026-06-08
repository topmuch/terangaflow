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
//   - Every 45min : baggage security reminder (time-window check)
//   - Every 90min : valuables security reminder (time-window check)
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
  // Use time-window deduplication instead of once-per-day.
  // This allows reminders to repeat at regular intervals.

  // Baggage reminder: every 45 minutes
  const baggageCreated = await createReminderIfExpired(
    stationId,
    "reminder_baggage",
    45, // re-trigger every 45 min
    [
      { type: "mp3", src: "/audio/ding-dong.mp3" },
      { type: "mp3", src: "/audio/rappel_bagages.mp3" },
    ]
  );
  if (baggageCreated) triggeredCount++;

  // Valuables reminder: every 90 minutes
  const valuablesCreated = await createReminderIfExpired(
    stationId,
    "reminder_valuables",
    90, // re-trigger every 90 min
    [
      { type: "mp3", src: "/audio/ding-dong.mp3" },
      { type: "mp3", src: "/audio/rappel_valeurs.mp3" },
    ]
  );
  if (valuablesCreated) triggeredCount++;

  // ═══ 2. TRIP DEPARTURE LIFECYCLE (Time-based) ══════════════════════════════════
  // Fetch upcoming trips within a wider window (-10 to +30 min)
  const upcomingTrips = await db.trip.findMany({
    where: {
      line: { stationId },
      status: { in: ["scheduled", "boarding", "delayed", "departure_imminent"] },
      departureTime: {
        gte: new Date(now.getTime() - 10 * 60 * 1000),  // -10 min margin
        lte: new Date(now.getTime() + 30 * 60 * 1000), // +30 min ahead
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

      const created = await createAnnouncementOnce(
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

    // ── T-2min : Départ Imminent (boarding/delayed → departure_imminent) ─────────
    if (
      timeDiffMinutes <= 2 &&
      timeDiffMinutes >= -1 &&
      (trip.status === "boarding" || trip.status === "delayed")
    ) {
      await db.trip.update({
        where: { id: trip.id },
        data: { status: "departure_imminent" },
      });

      const created = await createAnnouncementOnce(
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

      const created = await createAnnouncementOnce(
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

// ─── Helper: Create trip announcement once per day per key ──────────────────────

async function createAnnouncementOnce(
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

// ─── Helper: Create reminder if enough time has passed since last one ────────────

async function createReminderIfExpired(
  stationId: string,
  reminderType: string,
  intervalMinutes: number,
  payload: AudioSegment[]
): Promise<boolean> {
  const cutoff = new Date(Date.now() - intervalMinutes * 60 * 1000);

  // Check if a reminder of this type was created recently
  const recent = await db.announcementQueue.findFirst({
    where: {
      stationId,
      type: reminderType,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recent) return false; // Already triggered within interval

  await db.announcementQueue.create({
    data: {
      stationId,
      type: reminderType,
      status: "pending",
      channel: "VOCAL_PA",
      scheduledAt: new Date(),
      payload: JSON.stringify(payload),
      title: reminderType,
      priority: 30, // Lower priority than trip announcements
    },
  });

  console.log(`[autoScheduler] 🔔 Reminder triggered: ${reminderType}`);
  return true;
}
