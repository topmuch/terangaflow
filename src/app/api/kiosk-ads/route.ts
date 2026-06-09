// ─── /api/kiosk-ads ─────────────────────────────────────────────────────────────
//
// CRUD pour les publicités kiosk fullscreen :
//   GET    → Liste toutes les pubs d'une station
//   POST   → Crée une nouvelle pub
//

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET: Lister les pubs d'une station ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");

  if (!stationId) {
    return NextResponse.json({ error: "stationId requis" }, { status: 400 });
  }

  const ads = await db.kioskAd.findMany({
    where: { stationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ads });
}

// ─── POST: Créer une pub ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, name, type, url, durationSeconds, intervalMinutes } = body;

    if (!stationId || !name || !type || !url) {
      return NextResponse.json(
        { error: "Champs requis: stationId, name, type, url" },
        { status: 400 }
      );
    }

    const validTypes = ["IMAGE", "VIDEO", "YOUTUBE"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Type invalide. Valeurs: IMAGE, VIDEO, YOUTUBE" },
        { status: 400 }
      );
    }

    const ad = await db.kioskAd.create({
      data: {
        stationId,
        name,
        type,
        url,
        durationSeconds: durationSeconds ?? 15,
        intervalMinutes: intervalMinutes ?? 30,
        isActive: true,
      },
    });

    return NextResponse.json({ ad }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/kiosk-ads] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  }
}
