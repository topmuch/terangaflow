import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { DeparturesResponse, DepartureItem, TickerMessage, MerchantItem } from "@/types/signage";
import { TRIP_STATUS } from "@/types/signage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse<DeparturesResponse | { error: string }>> {
  const { stationId } = await params;

  // ─── Fetch station ────────────────────────────────────────────────────────
  const station = await db.station.findFirst({
    where: { id: stationId, isActive: true },
  });

  if (!station) {
    return NextResponse.json(
      { error: "Gare non trouvée ou inactive." },
      { status: 404 }
    );
  }

  // ─── Fetch trips with line info ───────────────────────────────────────────
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const twelveHoursAhead = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const trips = await db.trip.findMany({
    where: {
      line: { stationId: station.id },
      departureTime: {
        gte: twoHoursAgo,
        lte: twelveHoursAhead,
      },
      deletedAt: null,
    },
    include: { line: true },
    orderBy: { departureTime: "asc" },
  });

  // ─── Map to DepartureItem ─────────────────────────────────────────────────
  const departures: DepartureItem[] = trips.map((trip) => {
    const departureDate = new Date(trip.departureTime);
    const minutesUntilDeparture = Math.round(
      (departureDate.getTime() - now.getTime()) / 60000
    );

    // Map DB status string to typed TripStatus
    const statusUpper = trip.status.toUpperCase();
    const isValidStatus = (
      Object.values(TRIP_STATUS) as readonly string[]
    ).includes(statusUpper);

    return {
      id: trip.id,
      destination: trip.line.name.includes("→")
        ? trip.line.name.split("→").pop()?.trim() ?? trip.line.name
        : trip.line.name,
      operatorName: trip.operatorName,
      departureTime: trip.departureTime.toISOString(),
      estimatedArrival: trip.estimatedArrival.toISOString(),
      status: isValidStatus
        ? (statusUpper as DepartureItem["status"])
        : TRIP_STATUS.SCHEDULED,
      platform: trip.platform,
      lineCode: trip.line.code,
      lineName: trip.line.name,
      notes: trip.notes,
      minutesUntilDeparture,
    };
  });

  // ─── Fetch active merchants ───────────────────────────────────────────
  const merchants = await db.merchant.findMany({
    where: { stationId: station.id, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      whatsapp: true,
      mapsUrl: true,
      promoText: true,
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  // ─── Ticker messages from database ─────────────────────────────────────────
  const tickerRecords = await db.tickerMessage.findMany({
    where: { stationId: station.id, isActive: true, deletedAt: null },
    select: { id: true, text: true, type: true, displayOrder: true },
    orderBy: { displayOrder: "asc" },
  });

  const tickerMessages: TickerMessage[] = tickerRecords.map((t) => ({
    id: t.id,
    text: t.text,
    type: t.type as TickerMessage["type"],
    displayOrder: t.displayOrder,
  }));

  // Fallback if no ticker messages exist
  if (tickerMessages.length === 0) {
    tickerMessages.push(
      { id: "ticker-default-1", text: `Bienvenue à ${station.name} — TerangaFlow, l'intelligence des gares.`, type: "info", displayOrder: 1 },
      { id: "ticker-default-2", text: "Retrouvez les horaires en temps réel sur votre téléphone : scannez le QR code.", type: "info", displayOrder: 2 }
    );
  }

  // ─── Response ────────────────────────────────────────────────────────────
  return NextResponse.json({
    station: {
      id: station.id,
      name: station.name,
      code: station.code,
      city: station.city,
      country: station.country,
      timezone: station.timezone,
    },
    departures,
    merchants: merchants as MerchantItem[],
    updatedAt: new Date().toISOString(),
    tickerMessages,
  });
}
