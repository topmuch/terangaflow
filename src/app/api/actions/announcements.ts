"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Audio Segment Types (matching client-side AutoAnnouncer) ────────────────────

type AudioSegment =
  | { type: "mp3"; src: string }
  | { type: "tts"; text: string; lang?: string };

// ─── Create Manual Announcement (for Dashboard → Kiosk queue) ─────────────────

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
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { success: false, error: "Non autorisé" };
  }

  // Determine the stationId:
  // Prefer the user's assigned station, fall back to tenantId
  const stationId = session.user.stationId || session.user.tenantId;
  if (!stationId) {
    return { success: false, error: "Aucune gare assignée" };
  }

  let sequence: AudioSegment[] = [];
  let title = "";
  let priority = 50;

  // Build audio sequence based on call type — all use MP3 ding-dong
  if (type === "passenger") {
    if (!data.name || !data.location) {
      return { success: false, error: "Nom et lieu requis" };
    }
    sequence = [
      { type: "mp3", src: "/audio/ding-dong.mp3" },
      { type: "tts", text: `Le passager ${data.name}` },
      { type: "tts", text: `est attendu au ${data.location}.` },
    ];
    title = `Appel Passager: ${data.name}`;
  } else if (type === "driver") {
    if (!data.destination || !data.platform) {
      return { success: false, error: "Destination et quai requis" };
    }
    sequence = [
      { type: "mp3", src: "/audio/ding-dong.mp3" },
      { type: "tts", text: `Le chauffeur du bus pour ${data.destination}` },
      { type: "tts", text: `est attendu au ${data.platform}.` },
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
    priority = 200; // Highest priority
  }

  try {
    // Insert into the kiosk announcement queue
    await db.announcementQueue.create({
      data: {
        stationId,
        type: "manual_call",
        status: "pending",
        channel: "VOCAL_PA",
        scheduledAt: new Date(), // Play immediately
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
