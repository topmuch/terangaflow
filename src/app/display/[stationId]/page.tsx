import { db } from "@/lib/db";
import KioskDisplay from "@/components/signage/KioskDisplay";
import { AutoAnnouncer } from "@/components/signage/AutoAnnouncer";

export const revalidate = 30; // Revalide les données toutes les 30 secondes côté serveur

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ stationId: string }>;
}) {
  const { stationId } = await params;

  // ─── Fetch station ─────────────────────────────────────────────────────────
  const station = await db.station.findFirst({
    where: { id: stationId, isActive: true, deletedAt: null },
  });

  if (!station) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 gap-4 text-white">
        <span className="text-6xl">🚉</span>
        <h1 className="text-3xl font-bold">Gare introuvable</h1>
        <p className="text-slate-400 text-center max-w-md">
          L&apos;identifiant de la gare est invalide ou la gare a été désactivée.
        </p>
      </div>
    );
  }

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const twelveHoursAhead = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // ─── Fetch departures & arrivals ──────────────────────────────────────────
  const [departures, arrivals] = await Promise.all([
    db.trip.findMany({
      where: {
        line: { stationId: station.id },
        type: "departure",
        status: { notIn: ["departed", "cancelled"] },
        departureTime: { gte: twoHoursAgo, lte: twelveHoursAhead },
        deletedAt: null,
      },
      include: { line: true },
      orderBy: { departureTime: "asc" },
      take: 12,
    }),
    db.trip.findMany({
      where: {
        line: { stationId: station.id },
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

  const mappedDepartures = departures.map((t) => ({
    id: t.id,
    time: formatTime(new Date(t.departureTime)),
    location: t.line.name,
    status: t.status.toUpperCase(),
    platform: t.platform,
    delayMinutes: t.delayMinutes,
  }));

  const mappedArrivals = arrivals.map((t) => ({
    id: t.id,
    time: formatTime(new Date(t.estimatedArrival)),
    location: t.line.name,
    status: t.status.toUpperCase(),
    platform: t.platform,
    delayMinutes: t.delayMinutes,
  }));

  return (
    <>
      <KioskDisplay
        stationName={station.name}
        initialDepartures={mappedDepartures}
        initialArrivals={mappedArrivals}
        stationId={stationId}
      />
      {/* Auto Announcer — polls for pending announcements and plays them */}
      <AutoAnnouncer stationId={stationId} />
    </>
  );
}
