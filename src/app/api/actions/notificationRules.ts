"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── STEP 1: Seed Default Notification Rules ────────────────────────────────────
//
// Inserts the 3 standard TerangaFlow rules into the DB.
// Safe to call multiple times — checks for existing rules first.
//

export async function seedDefaultNotificationRules() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { success: false, message: "Non autorisé" };
  }

  const stationId = session.user.stationId || session.user.tenantId;
  if (!stationId) {
    return { success: false, message: "Aucune gare assignée" };
  }

  // 1. Check if rules already exist for this station
  const existingCount = await db.notificationRule.count({
    where: { stationId },
  });

  if (existingCount > 0) {
    return { success: false, message: "Les règles sont déjà configurées pour cette gare." };
  }

  // 2. Insert the 3 default rules — adapted to existing schema fields
  try {
    await db.notificationRule.createMany({
      data: [
        {
          name: "Embarquement (T-15min)",
          triggerFrom: "scheduled",
          triggerTo: "boarding",
          channel: "VOCAL_PA",
          template: "boarding_announcement",
          repeatEveryMin: 0,
          repeatMaxTimes: 1,
          priority: 50,
          isActive: true,
          stationId,
        },
        {
          name: "Départ Imminent (T-2min)",
          triggerFrom: "boarding",
          triggerTo: "departure_imminent",
          channel: "VOCAL_PA",
          template: "imminent_departure",
          repeatEveryMin: 0,
          repeatMaxTimes: 1,
          priority: 100,
          isActive: true,
          stationId,
        },
        {
          name: "Rappel Sécurité Bagages",
          triggerFrom: "scheduled",
          triggerTo: "scheduled",
          channel: "VOCAL_PA",
          template: "security_reminder",
          repeatEveryMin: 45,
          repeatMaxTimes: 0, // Unlimited
          priority: 10,
          isActive: true,
          stationId,
        },
      ],
    });

    console.log(`[seedDefaultNotificationRules] ✅ 3 rules created for station ${stationId}`);
    revalidatePath("/station/[stationId]/notifications");

    return { success: true, message: "✅ Règles de notification TerangaFlow créées avec succès !" };
  } catch (err) {
    console.error("[seedDefaultNotificationRules] Error:", err);
    return { success: false, message: "Erreur lors de la création des règles." };
  }
}

// ─── STEP 2: Process Automated Notifications ────────────────────────────────────
//
// Checks upcoming trips and creates announcement queue entries
// for boarding (T-15min) and departure imminent (T-2min).
// Designed to be called manually from the dashboard or via cron.
//

export async function processAutomatedNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { success: false, error: "Non autorisé" };
  }

  const stationId = session.user.stationId || session.user.tenantId;
  if (!stationId) {
    return { success: false, error: "Aucune gare assignée" };
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  console.log(`[processAutomatedNotifications] 🔄 Checking station ${stationId} at ${now.toISOString()}`);

  try {
    // 1. Fetch all upcoming trips for this station (via line.stationId)
    const upcomingTrips = await db.trip.findMany({
      where: {
        line: { stationId },
        departureTime: {
          gte: now,
          lte: twoHoursLater,
        },
        status: { in: ["scheduled", "boarding", "delayed"] },
      },
      include: { line: true },
      orderBy: { departureTime: "asc" },
    });

    console.log(`[processAutomatedNotifications] 📋 Found ${upcomingTrips.length} upcoming trip(s)`);

    let triggeredCount = 0;

    for (const trip of upcomingTrips) {
      const timeDiffMinutes = Math.floor(
        (trip.departureTime.getTime() - now.getTime()) / (1000 * 60)
      );

      const destination = trip.line.name;
      const platform = trip.platform || "à déterminer";

      console.log(
        `[processAutomatedNotifications] 🚌 Trip "${destination}" | ` +
        `T-${timeDiffMinutes}min | Status: ${trip.status} | Platform: ${platform}`
      );

      // ── LOGIC 1: BOARDING (T-15min window: 10 < T <= 15) ───────────
      if (
        timeDiffMinutes <= 15 &&
        timeDiffMinutes > 10 &&
        trip.status === "scheduled"
      ) {
        const alreadyAnnounced = await db.announcementQueue.findFirst({
          where: {
            tripId: trip.id,
            type: "auto_boarding",
            createdAt: { gte: todayStart },
          },
        });

        if (!alreadyAnnounced) {
          await db.announcementQueue.create({
            data: {
              stationId,
              tripId: trip.id,
              type: "auto_boarding",
              status: "pending",
              channel: "VOCAL_PA",
              scheduledAt: new Date(),
              title: `Embarquement: ${destination}`,
              priority: 50,
              payload: JSON.stringify([
                { type: "mp3", src: "/audio/ding-dong.mp3" },
                { type: "tts", text: `Le bus à destination de ${destination} est en cours d'embarquement au quai ${platform}.` },
              ]),
            },
          });
          triggeredCount++;
          console.log(`[processAutomatedNotifications] ✅ Created boarding announcement for "${destination}"`);
        }
      }

      // ── LOGIC 2: DEPARTURE IMMINENT (T-2min window: 0 <= T <= 2) ──
      if (
        timeDiffMinutes <= 2 &&
        timeDiffMinutes >= 0 &&
        trip.status !== "departure_imminent" &&
        trip.status !== "departed"
      ) {
        const alreadyAnnounced = await db.announcementQueue.findFirst({
          where: {
            tripId: trip.id,
            type: "auto_imminent",
            createdAt: { gte: todayStart },
          },
        });

        if (!alreadyAnnounced) {
          await db.announcementQueue.create({
            data: {
              stationId,
              tripId: trip.id,
              type: "auto_imminent",
              status: "pending",
              channel: "VOCAL_PA",
              scheduledAt: new Date(),
              title: `Départ imminent: ${destination}`,
              priority: 100,
              payload: JSON.stringify([
                { type: "mp3", src: "/audio/ding-dong.mp3" },
                { type: "tts", text: `Dernier appel. Le bus pour ${destination} va partir dans 2 minutes. Quai ${platform}.` },
              ]),
            },
          });
          triggeredCount++;
          console.log(`[processAutomatedNotifications] ✅ Created imminent departure for "${destination}"`);

          // Update trip status
          await db.trip.update({
            where: { id: trip.id },
            data: { status: "departure_imminent" },
          });
        }
      }
    }

    const message =
      triggeredCount > 0
        ? `Vérification terminée. ${triggeredCount} annonce(s) programmée(s).`
        : "Vérification terminée. Aucune nouvelle annonce à programmer.";

    console.log(`[processAutomatedNotifications] 📢 ${message}`);
    return { success: true, message };
  } catch (err) {
    console.error("[processAutomatedNotifications] Error:", err);
    return { success: false, error: "Erreur lors de la vérification automatique." };
  }
}

// ─── STEP 3: Manual Delay Announcement ──────────────────────────────────────────
//
// Creates a delay announcement with the number of minutes.
// Called from the dashboard when an agent marks a trip as delayed.
//

export async function announceDelay(data: {
  tripId: string;
  destination: string;
  platform: string;
  delayMinutes: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { success: false, error: "Non autorisé" };
  }

  const stationId = session.user.stationId || session.user.tenantId;
  if (!stationId) {
    return { success: false, error: "Aucune gare assignée" };
  }

  const { tripId, destination, platform, delayMinutes } = data;

  try {
    await db.announcementQueue.create({
      data: {
        stationId,
        tripId,
        type: "auto_delay",
        status: "pending",
        channel: "VOCAL_PA",
        scheduledAt: new Date(),
        title: `Retard: ${destination} (+${delayMinutes}min)`,
        priority: 150,
        payload: JSON.stringify([
          { type: "mp3", src: "/audio/ding-dong.mp3" },
          { type: "tts", text: `Attention voyageurs.` },
          { type: "mp3", src: "/audio/phrase_retard.mp3" },
          { type: "tts", text: `Le départ du bus pour ${destination} au quai ${platform}` },
          { type: "tts", text: `est retardé de ${delayMinutes} minutes.` },
          { type: "mp3", src: "/audio/phrase_minutes.mp3" },
        ]),
      },
    });

    console.log(`[announceDelay] ✅ Delay announcement created: ${destination} +${delayMinutes}min`);
    return { success: true, message: `Annonce de retard créée: ${destination} +${delayMinutes}min` };
  } catch (err) {
    console.error("[announceDelay] Error:", err);
    return { success: false, error: "Erreur lors de la création de l'annonce de retard." };
  }
}
