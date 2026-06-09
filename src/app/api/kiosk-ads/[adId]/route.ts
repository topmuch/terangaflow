// ─── /api/kiosk-ads/[adId] ──────────────────────────────────────────────────────
//
// CRUD individuel pour une publicité kiosk :
//   PATCH  → Met à jour une pub (toggle isActive, modifier les champs)
//   DELETE → Supprime une pub
//

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── PATCH: Mettre à jour une pub ──────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const { adId } = await params;
    const body = await request.json();

    const existing = await db.kioskAd.findUnique({ where: { id: adId } });
    if (!existing) {
      return NextResponse.json({ error: "Pub introuvable" }, { status: 404 });
    }

    const ad = await db.kioskAd.update({
      where: { id: adId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.durationSeconds !== undefined
          ? { durationSeconds: body.durationSeconds }
          : {}),
        ...(body.intervalMinutes !== undefined
          ? { intervalMinutes: body.intervalMinutes }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({ ad });
  } catch (error) {
    console.error("[PATCH /api/kiosk-ads/:adId] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Supprimer une pub ─────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ adId: string }> }
) {
  try {
    const { adId } = await params;

    const existing = await db.kioskAd.findUnique({ where: { id: adId } });
    if (!existing) {
      return NextResponse.json({ error: "Pub introuvable" }, { status: 404 });
    }

    await db.kioskAd.delete({ where: { id: adId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/kiosk-ads/:adId] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
