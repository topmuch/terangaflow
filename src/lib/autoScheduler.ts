// ─── Auto Scheduler (Range-Based Triggers) ──────────────────────────────────────
//
// PLANIFICATEUR AUTOMATIQUE DES ANNONCES PA
//
// Système zéro-clic : les annonces sont déclenchées automatiquement
// par rapport à l'heure de départ/arrivée prévue de chaque trip.
//
// Appelé par /api/announcements/check-auto (POST) toutes les 3s par le kiosk.
//
// Déclencheurs par PLAGE de minutes (range-based) au lieu de minute exacte :
//   ✅ Plus robuste : le polling toutes les 3s ne rate jamais un déclencheur
//   ✅ Comportement identique à une horloge ferroviaire SNCF
//   ✅ La déduplication via enqueueIfNew empêche les annonces en double
//
// CYCLE DES DÉPARTS :
//   diff ∈ ]30, +∞]    → (aucune action)
//   diff ∈ ]15, 30]     → T-30 : status boarding + annonce embarquement
//   diff ∈ ]5, 15]      → T-15 : rappel 15 minutes
//   diff ∈ [0, 5]       → T-5  : rappel 5 minutes + dernier appel
//   diff < 0            → H+0  : status departed + annonce de départ
//
// CYCLE DES ARRIVÉES :
//   diff ∈ ]10, +∞]    → (aucune action)
//   diff ∈ (0, 10]      → T-10 : status arrival_imminent + annonce
//   diff <= 0           → H+0  : status arrived + annonce
//
// ACCUEIL :
//   Toutes les heures pile (xx:00) → message de bienvenue
//
// RETARDS :
//   Statut "delayed" → répétition automatique toutes les 5 min
//

import { db } from "@/lib/db";

// ═══════════════════════════════════════════════════════════════════════════════
//  CORE SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkAndTriggerAutomatedAnnouncements(stationId: string) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const timeNow = currentHour * 60 + currentMinute;

  console.log(`[autoScheduler] 🔄 Checking station ${stationId} at ${now.toISOString()}`);

  let triggeredCount = 0;

  // ═══ 1. ACCUEIL GÉNÉRAL (Toutes les heures pile) ══════════════════════════════
  if (currentMinute === 0) {
    const welcomeCreated = await enqueueIfNew(
      stationId,
      "welcome_hourly",
      [
        "Mesdames et Messieurs, bienvenue en gare. Nous vous souhaitons un agréable voyage. Les informations de circulation sont affichées sur les panneaux. Nous vous invitons à vérifier votre billet avant l'embarquement.",
      ]
    );
    if (welcomeCreated) {
      triggeredCount++;
      console.log("[autoScheduler] 🎙️ Welcome hourly announcement enqueued");
    }
  }

  // ═══ 2. CYCLE DES DÉPARTS & ARRIVÉES ══════════════════════════════════════════
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000);  // -10 min margin
  const windowEnd   = new Date(now.getTime() + 35 * 60 * 1000);   // +35 min ahead

  const upcomingTrips = await db.trip.findMany({
    where: {
      line: { stationId },
      status: { in: ["scheduled", "boarding", "delayed", "arrival_imminent"] },
      OR: [
        // Departures: filter by departureTime
        {
          type: "departure",
          departureTime: { gte: windowStart, lte: windowEnd },
        },
        // Arrivals: filter by estimatedArrival
        {
          type: "arrival",
          estimatedArrival: { gte: windowStart, lte: windowEnd },
        },
      ],
    },
    include: { line: true },
    orderBy: { departureTime: "asc" },
  });

  console.log(`[autoScheduler] 📋 Found ${upcomingTrips.length} upcoming trip(s)`);

  for (const trip of upcomingTrips) {
    // Use departureTime for departures, estimatedArrival for arrivals
    const refTime =
      trip.type === "arrival" ? trip.estimatedArrival : trip.departureTime;
    const tripMinutes = refTime.getHours() * 60 + refTime.getMinutes();
    const diff = tripMinutes - timeNow;

    const dest = trip.line.name;
    const platform = trip.platform ?? "à déterminer";
    const typePrefix = trip.type === "departure" ? "dep" : "arr";

    // ── DÉPARTS (Range-Based) ─────────────────────────────────────────────────
    if (trip.type === "departure") {
      // diff ∈ ]15, 30] : Embarquement (scheduled → boarding)
      if (diff <= 30 && diff > 15 && trip.status === "scheduled") {
        await db.trip.update({
          where: { id: trip.id },
          data: { status: "boarding" },
        });
        const created = await enqueueIfNew(
          stationId,
          `${typePrefix}_${trip.id}_30`,
          [
            `Votre attention s'il vous plaît. Le bus à destination de ${dest} partira dans 30 minutes depuis le quai ${platform}. Nous invitons les voyageurs à se préparer. Veuillez surveiller vos bagages et respecter les consignes de sécurité. Nous vous souhaitons un excellent voyage.`,
          ]
        );
        if (created) {
          triggeredCount++;
          console.log(`[autoScheduler] ✅ BOARDING: ${dest} (diff=${diff})`);
        }
      }

      // diff ∈ ]5, 15] : Rappel 15 minutes
      else if (diff <= 15 && diff > 5 && trip.status === "boarding") {
        const created = await enqueueIfNew(
          stationId,
          `${typePrefix}_${trip.id}_15`,
          [`Le bus à destination de ${dest} partira dans 15 minutes.`]
        );
        if (created) {
          triggeredCount++;
          console.log(`[autoScheduler] ✅ 15min reminder: ${dest} (diff=${diff})`);
        }
      }

      // diff ∈ [0, 5] : Rappel 5 minutes + dernier appel
      else if (diff <= 5 && diff >= 0 && (trip.status === "boarding" || trip.status === "delayed")) {
        // Rappel 5min
        const created5 = await enqueueIfNew(
          stationId,
          `${typePrefix}_${trip.id}_5`,
          [`Le bus à destination de ${dest} partira dans 5 minutes.`]
        );
        if (created5) {
          triggeredCount++;
          console.log(`[autoScheduler] ✅ 5min reminder: ${dest} (diff=${diff})`);
        }

        // Dernier appel (seulement dans les 2 dernières minutes)
        if (diff <= 2) {
          const created2 = await enqueueIfNew(
            stationId,
            `${typePrefix}_${trip.id}_2`,
            [`Dernier appel pour les voyageurs à destination de ${dest}.`]
          );
          if (created2) {
            triggeredCount++;
            console.log(`[autoScheduler] ✅ Last call: ${dest} (diff=${diff})`);
          }
        }

        // Départ imminent (dernière minute)
        if (diff <= 1) {
          const created1 = await enqueueIfNew(
            stationId,
            `${typePrefix}_${trip.id}_1`,
            [`Le départ du bus est imminent. Veuillez rejoindre votre véhicule et prendre place.`]
          );
          if (created1) {
            triggeredCount++;
            console.log(`[autoScheduler] ✅ Imminent departure: ${dest} (diff=${diff})`);
          }
        }
      }

      // diff < 0 : Parti (anything → departed)
      else if (diff < 0 && trip.status !== "departed" && trip.status !== "cancelled") {
        await db.trip.update({
          where: { id: trip.id },
          data: { status: "departed" },
        });
        const created = await enqueueIfNew(
          stationId,
          `${typePrefix}_${trip.id}_departed`,
          [`Le bus à destination de ${dest} vient de partir. Bon voyage.`]
        );
        if (created) {
          triggeredCount++;
          console.log(`[autoScheduler] ✅ DEPARTED: ${dest} (diff=${diff})`);
        }
      }
    }

    // ── ARRIVÉES (Range-Based) ───────────────────────────────────────────────
    if (trip.type === "arrival") {
      // diff ∈ (0, 10] : Arrivée imminente (scheduled → arrival_imminent)
      if (diff <= 10 && diff > 0 && trip.status === "scheduled") {
        await db.trip.update({
          where: { id: trip.id },
          data: { status: "arrival_imminent" },
        });
        const created = await enqueueIfNew(
          stationId,
          `${typePrefix}_${trip.id}_10`,
          [
            `Le bus en provenance de ${dest} arrive dans quelques instants au quai ${platform}.`,
          ]
        );
        if (created) {
          triggeredCount++;
          console.log(`[autoScheduler] ✅ ARRIVAL_IMMINENT: ${dest} (diff=${diff})`);
        }
      }

      // diff <= 0 : Arrivé
      else if (diff <= 0 && trip.status !== "arrived" && trip.status !== "cancelled") {
        await db.trip.update({
          where: { id: trip.id },
          data: { status: "arrived" },
        });
        const created = await enqueueIfNew(
          stationId,
          `${typePrefix}_${trip.id}_arrived`,
          [
            `Le bus en provenance de ${dest} est arrivé. Les passagers peuvent descendre et les colis sont disponibles au guichet. Veuillez surveiller vos effets personnels. Ne laissez aucun bagage sans surveillance. Tout bagage abandonné sera signalé aux services de sécurité.`,
          ]
        );
        if (created) {
          triggeredCount++;
          console.log(`[autoScheduler] ✅ ARRIVED: ${dest} (diff=${diff})`);
        }
      }
    }
  }

  // ═══ 3. RETARDS (Répétition auto toutes les 5 min si statut = delayed) ════════
  const delayedTrips = await db.trip.findMany({
    where: {
      line: { stationId },
      status: "delayed",
    },
    include: { line: true },
  });

  for (const trip of delayedTrips) {
    // Vérifier si une annonce de retard a été créée dans les 5 dernières minutes
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const lastAnnounce = await db.announcementQueue.findFirst({
      where: {
        tripId: trip.id,
        createdAt: { gte: fiveMinAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lastAnnounce && trip.delayMinutes > 0) {
      const created = await enqueueIfNew(
        stationId,
        `delay_${trip.id}_${Math.floor(now.getTime() / 60000)}`,
        [
          `Le bus à destination de ${trip.line.name} subit actuellement un retard de ${trip.delayMinutes} minutes. Nous vous prions de nous excuser pour la gêne occasionnée. Merci de votre compréhension et de votre patience.`,
        ],
        trip.id
      );
      if (created) {
        triggeredCount++;
        console.log(`[autoScheduler] ✅ DELAY repeat: ${trip.line.name} (${trip.delayMinutes}min)`);
      }
    }
  }

  console.log(`[autoScheduler] 📢 ${triggeredCount} announcement(s) triggered`);
  return { triggeredCount };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enqueue an announcement if one with the same `type` key
 * hasn't been created in the last 24 hours.
 *
 * Payload is a JSON array of plain text strings.
 * The client AutoAnnouncer will play each string via TTS
 * preceded by a synthetic Ding-Dong.
 */
async function enqueueIfNew(
  stationId: string,
  uniqueKey: string,
  messages: string[],
  tripId?: string
): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

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
      tripId: tripId ?? null,
      type: uniqueKey,
      status: "pending",
      channel: "VOCAL_PA",
      scheduledAt: new Date(),
      payload: JSON.stringify(messages),
      title: uniqueKey,
      message: messages.join(" "),
      priority: uniqueKey.startsWith("manual_") ? 150 : 50,
    },
  });

  return true;
}
