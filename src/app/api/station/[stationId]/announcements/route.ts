// ─── GET/POST /api/station/[stationId]/announcements ─────────────────────────────
//
// GET  — Fetch announcements for a station (optional ?status=pending filter)
// POST — Complete or fail an announcement (action: "complete" | "fail")
// REQUIRES AUTH + tenant isolation.
//

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { completeAnnouncement, failAnnouncement } from "@/lib/notificationDispatcher";
import { z } from "zod";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const where: Record<string, unknown> = {
      stationId,
    };

    // Apply status filter if provided
    if (statusParam) {
      where.status = statusParam;
    }

    const announcements = await db.announcementQueue.findMany({
      where,
      orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
      take: 50,
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("Erreur lors de la récupération des annonces:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────────

const announcementActionSchema = z.object({
  announcementId: z.string().min(1, "L'identifiant de l'annonce est requis."),
  action: z.enum(["complete", "fail"]),
  error: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide." },
        { status: 400 }
      );
    }

    const parsed = announcementActionSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Validation échouée." },
        { status: 400 }
      );
    }

    const { announcementId, action, error: errorMessage } = parsed.data;

    if (action === "complete") {
      await completeAnnouncement(announcementId);
    } else {
      await failAnnouncement(announcementId, errorMessage ?? "Échec inconnu");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'action sur l'annonce:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
