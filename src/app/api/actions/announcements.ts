"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Audio Segment Types ──────────────────────────────────────────────────────────

type AudioSegment = { type: "mp3"; src: string } | { type: "tts"; text: string };

// ─── Manual Trip Action (DELAY / CANCEL) ────────────────────────────────────────
//
// Only 2 manual actions for trips: Delay and Cancel.
// Boarding/Imminent/Departed are handled automatically by the scheduler.

export async function triggerManualTripAction(
  action: "DELAY" | "CANCEL",
  tripId: string,
  delayMinutes?: number
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { success: false, error: "Non autorisé" };
  }

  const stationId = session.user.stationId || session.user.tenantId;

  const trip = await db.trip.findFirst({
    where: { id: tripId },
    include: { line: true },
  });

  if (!trip) {
    return { success: false, error: "Trajet non trouvé" };
  }

  const destination = trip.line.name;
  const platform = trip.platform || "à déterminer";

  try {
    if (action === "DELAY") {
      const minutes = delayMinutes ?? 15;

      await db.trip.update({
        where: { id: tripId },
        data: { status: "delayed", delayMinutes: minutes },
      });

      const sequence: AudioSegment[] = [
        { type: "mp3", src: "/audio/ding-dong.mp3" },
        { type: "tts", text: "Attention voyageurs." },
        { type: "mp3", src: "/audio/phrase_retard.mp3" },
        { type: "tts", text: `Le départ du bus pour ${destination} au quai ${platform} est retardé de ${minutes} minutes.` },
        { type: "mp3", src: "/audio/phrase_minutes.mp3" },
      ];

      await db.announcementQueue.create({
        data: {
          stationId,
          tripId,
          type: "manual_delay",
          status: "pending",
          channel: "VOCAL_PA",
          scheduledAt: new Date(),
          payload: JSON.stringify(sequence),
          title: `Retard : ${destination} (+${minutes}min)`,
          priority: 150,
        },
      });

      return { success: true, message: `Retard enregistré : ${destination} +${minutes}min` };
    }

    if (action === "CANCEL") {
      await db.trip.update({
        where: { id: tripId },
        data: { status: "cancelled" },
      });

      const sequence: AudioSegment[] = [
        { type: "mp3", src: "/audio/ding-dong.mp3" },
        { type: "tts", text: `Attention. Le bus à destination de ${destination} est annulé. Veuillez vous rapprocher du guichet pour plus d'informations.` },
      ];

      await db.announcementQueue.create({
        data: {
          stationId,
          tripId,
          type: "manual_cancel",
          status: "pending",
          channel: "VOCAL_PA",
          scheduledAt: new Date(),
          payload: JSON.stringify(sequence),
          title: `Annulation : ${destination}`,
          priority: 200,
        },
      });

      return { success: true, message: `Trajet annulé : ${destination}` };
    }

    return { success: false, error: "Action non reconnue" };
  } catch (err) {
    console.error("[triggerManualTripAction] Error:", err);
    return { success: false, error: "Erreur lors de l'action" };
  }
}

// ─── Manual Calls (Passenger, Driver, Emergency) ─────────────────────────────────
//
// Pushes audio sequences into the announcement queue for kiosk playback.

export async function createManualAnnouncement(
  type: "passenger" | "driver" | "emergency",
  data: {
    name?: string;
    location?: string;
    destination?: string;
    platform?: string;
    message?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { success: false, error: "Non autorisé" };
  }

  const stationId = session.user.stationId || session.user.tenantId;
  if (!stationId) {
    return { success: false, error: "Aucune gare assignée" };
  }

  let sequence: AudioSegment[] = [];
  let title = "";
  let priority = 50;

  if (type === "passenger") {
    if (!data.name || !data.location) {
      return { success: false, error: "Nom et lieu requis" };
    }
    sequence = [
      { type: "mp3", src: "/audio/ding-dong.mp3" },
      { type: "tts", text: `Le passager ${data.name} est attendu au ${data.location}.` },
    ];
    title = `Appel Passager: ${data.name}`;
  } else if (type === "driver") {
    if (!data.destination || !data.platform) {
      return { success: false, error: "Destination et quai requis" };
    }
    sequence = [
      { type: "mp3", src: "/audio/ding-dong.mp3" },
      { type: "tts", text: `Le chauffeur du bus pour ${data.destination} est attendu au ${data.platform}.` },
    ];
    title = `Appel Chauffeur: ${data.destination}`;
  } else if (type === "emergency") {
    if (!data.message) {
      return { success: false, error: "Message d'urgence requis" };
    }
    sequence = [
      { type: "mp3", src: "/audio/ding-dong.mp3" },
      { type: "tts", text: "Attention. Message important." },
      { type: "tts", text: data.message },
    ];
    title = `URGENCE: ${data.message}`;
    priority = 200;
  }

  try {
    await db.announcementQueue.create({
      data: {
        stationId,
        type: `manual_${type}`,
        status: "pending",
        channel: "VOCAL_PA",
        scheduledAt: new Date(),
        payload: JSON.stringify(sequence),
        title,
        priority,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[createManualAnnouncement] DB error:", err);
    return { success: false, error: "Erreur lors de l'enregistrement" };
  }
}
