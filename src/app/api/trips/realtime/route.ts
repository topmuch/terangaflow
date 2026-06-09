// ─── GET /api/trips/realtime?stationId=xxx ─────────────────────────────────────────
//
// Endpoint temps réel pour le kiosk KioskDisplay.
// Retourne les départs et arrivées actifs, mis à jour par polling 30s.
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
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const twelveHoursAhead = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const [departures, arrivals] = await Promise.all([
    // Départs : référence = departureTime, exclure les partis et annulés
    db.trip.findMany({
      where: {
        line: { stationId },
        type: "departure",
        status: { notIn: ["departed", "cancelled"] },
        departureTime: { gte: twoHoursAgo, lte: twelveHoursAhead },
        deletedAt: null,
      },
      include: { line: true },
      orderBy: { departureTime: "asc" },
      take: 12,
    }),

    // Arrivées : référence = estimatedArrival, exclure les arrivés et annulés
    db.trip.findMany({
      where: {
        line: { stationId },
        type: "arrival",
        status: { notIn: ["arrived", "cancelled"] },
        estimatedArrival: { gte: twoHoursAgo, lte: twelveHoursAhead },
        deletedAt: null,
      },
      include: { line: true },
      orderBy: { estimatedArrival: "asc" },
      take: 12,
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
