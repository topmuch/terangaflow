// ─── GET /api/trips/realtime?stationId=xxx ─────────────────────────────────────────
//
// Endpoint temps réel pour le kiosk KioskDisplay.
// CORRECTION BUG : garde les bus "PARTI" pendant 10 min pour que
// l'interface affiche le badge gris "PARTI" au lieu de rester figée.
//
// No auth required — kiosk is a public-facing display.
//

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");

  if (!stationId) {
    return NextResponse.json(
      { error: "stationId requis." },
      { status: 400 }
    );
  }

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // Garde les trajets récents 10 min

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const [departures, arrivals] = await Promise.all([
    // Départs : garde les PARTI pendant 10 min, exclut seulement les ANNULÉS
    db.trip.findMany({
      where: {
        line: { stationId },
        type: "departure",
        departureTime: { gte: tenMinutesAgo },
        status: { not: "cancelled" },
        deletedAt: null,
      },
      include: { line: true },
      orderBy: { departureTime: "asc" },
      take: 15,
    }),

    // Arrivées : garde les ARRIVÉS pendant 10 min, exclut seulement les ANNULÉS
    db.trip.findMany({
      where: {
        line: { stationId },
        type: "arrival",
        estimatedArrival: { gte: tenMinutesAgo },
        status: { not: "cancelled" },
        deletedAt: null,
      },
      include: { line: true },
      orderBy: { estimatedArrival: "asc" },
      take: 15,
    }),
  ]);

  return NextResponse.json({
    departures: departures.map((t) => ({
      id: t.id,
      time: formatTime(new Date(t.departureTime)),
      location: t.line.name,
      status: t.status.toUpperCase(),
      platform: t.platform,
      delayMinutes: t.delayMinutes,
    })),
    arrivals: arrivals.map((t) => ({
      id: t.id,
      time: formatTime(new Date(t.estimatedArrival)),
      location: t.line.name,
      status: t.status.toUpperCase(),
      platform: t.platform,
      delayMinutes: t.delayMinutes,
    })),
  });
}
