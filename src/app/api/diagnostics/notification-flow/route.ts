// ─── GET /api/diagnostics/notification-flow ─────────────────────────────────────
//
// Diagnostic endpoint that traces the entire notification flow:
// 1. Lists all stations and their IDs
// 2. Lists all trips with computed time diffs
// 3. Lists pending/completed announcements in queue
// 4. Simulates what the autoScheduler WOULD trigger right now
//
// Call with: GET /api/diagnostics/notification-flow?stationId=xxx
// Or without stationId to see all stations.
//

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");

    const now = new Date();

    // ─── 1. Stations ────────────────────────────────────────────────────────
    const stations = stationId
      ? await db.station.findMany({ where: { id: stationId } })
      : await db.station.findMany({ take: 10 });

    // ─── 2. Trips analysis ────────────────────────────────────────────────────
    const stationIds = stations.map((s) => s.id);
    const allTrips = stationIds.length > 0
      ? await db.trip.findMany({
          where: { line: { stationId: { in: stationIds } } },
          include: { line: true },
          orderBy: { departureTime: "asc" },
          take: 20,
        })
      : [];

    const tripAnalysis = allTrips.map((trip) => {
      const diffMs = trip.departureTime.getTime() - now.getTime();
      const diffMin = Math.round(diffMs / 60000);
      let autoAction: string | null = null;

      if (trip.status === "scheduled" && diffMin <= 15 && diffMin > 10) {
        autoAction = "→ BOARDING (T-15 triggered)";
      } else if ((trip.status === "boarding" || trip.status === "delayed") && diffMin <= 2 && diffMin >= -1) {
        autoAction = "→ DEPARTURE_IMMINENT (T-2 triggered)";
      } else if (diffMin < -1 && trip.status !== "departed" && trip.status !== "cancelled") {
        autoAction = "→ DEPARTED (H+1 triggered)";
      } else if (trip.status === "scheduled" && diffMin > 15) {
        autoAction = `Waiting (T-${diffMin}min, not yet in range)`;
      } else {
        autoAction = `No auto-action (status: ${trip.status}, T${diffMin >= 0 ? "+" : ""}${diffMin}min)`;
      }

      return {
        id: trip.id.substring(0, 10),
        destination: trip.line.name,
        lineCode: trip.line.code,
        status: trip.status,
        platform: trip.platform,
        departureTime: trip.departureTime.toISOString(),
        timeDiffMin: diffMin,
        autoAction,
      };
    });

    // ─── 3. Announcement queue ──────────────────────────────────────────────
    const queueStats = stationIds.length > 0
      ? await db.announcementQueue.groupBy({
          by: ["status"],
          where: { stationId: { in: stationIds } },
          _count: true,
        })
      : [];

    const recentAnnouncements = stationIds.length > 0
      ? await db.announcementQueue.findMany({
          where: { stationId: { in: stationIds } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
            priority: true,
            createdAt: true,
            playedAt: true,
            payload: true,
          },
        })
      : [];

    const announcementsAnalysis = recentAnnouncements.map((a) => ({
      id: a.id.substring(0, 10),
      type: a.type,
      status: a.status,
      title: a.title,
      priority: a.priority,
      createdAt: a.createdAt.toISOString(),
      playedAt: a.playedAt?.toISOString() ?? null,
      hasPayload: !!a.payload,
      payloadPreview: a.payload ? a.payload.substring(0, 80) + "..." : null,
    }));

    // ─── 4. AutoScheduler simulation ──────────────────────────────────────────
    const tripsInWindow = tripAnalysis.filter(
      (t) => {
        const d = t.timeDiffMin;
        return d >= -10 && d <= 30;
      }
    );

    const wouldTrigger = tripAnalysis.filter((t) => t.autoAction.includes("triggered"));

    // ─── Response ───────────────────────────────────────────────────────────
    return NextResponse.json({
      diagnostics: {
        timestamp: now.toISOString(),
        stations: stations.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          city: s.city,
        })),
        trips: tripAnalysis,
        queueStats: queueStats.map((q) => ({ status: q.status, count: q._count })),
        recentAnnouncements: announcementsAnalysis,
        autoSchedulerWindow: {
          checkedAt: now.toISOString(),
          windowStart: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
          windowEnd: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
          tripsInWindow: tripsInWindow.length,
          wouldTrigger,
        },
        audioFiles: {
          dingDong: true,
          phraseRetard: true,
          phraseMinutes: true,
          rappelBagages: true,
          rappelValeurs: true,
        },
      },
    });
  } catch (error) {
    console.error("[/api/diagnostics/notification-flow] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
