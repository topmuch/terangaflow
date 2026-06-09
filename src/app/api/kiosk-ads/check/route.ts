// ─── GET /api/kiosk-ads/check?stationId=xxx ────────────────────────────────────
//
// Endpoint interrogé par le Kiosk toutes les 10 secondes.
// Retourne la prochaine publicité à afficher si son intervalle est écoulé.
// Si une pub est retournée, lastPlayedAt est immédiatement mis à jour
// pour éviter les doublons en cas de polling simultané.
//
// No auth required — kiosk is a public-facing display.
//

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("stationId");

  if (!stationId) {
    return NextResponse.json(null);
  }

  const now = new Date();

  // Récupérer toutes les pubs actives de cette gare
  const activeAds = await db.kioskAd.findMany({
    where: {
      stationId,
      isActive: true,
    },
    orderBy: { lastPlayedAt: "asc" }, // Priorité à la plus ancienne / jamais jouée
  });

  if (activeAds.length === 0) {
    return NextResponse.json(null);
  }

  // Trouver la première pub dont l'intervalle est écoulé (ou jamais jouée)
  const adToPlay = activeAds.find((ad) => {
    if (!ad.lastPlayedAt) return true; // Jamais jouée → jouée maintenant
    const elapsed = now.getTime() - ad.lastPlayedAt.getTime();
    return elapsed >= ad.intervalMinutes * 60 * 1000;
  });

  if (adToPlay) {
    // Marquer comme jouée immédiatement pour éviter les doublons
    await db.kioskAd.update({
      where: { id: adToPlay.id },
      data: { lastPlayedAt: now },
    });

    return NextResponse.json({
      id: adToPlay.id,
      type: adToPlay.type,
      url: adToPlay.url,
      durationSeconds: adToPlay.durationSeconds,
      name: adToPlay.name,
    });
  }

  return NextResponse.json(null);
}
