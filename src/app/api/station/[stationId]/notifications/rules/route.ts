// ─── GET/POST /api/station/[stationId]/notifications/rules ──────────────────────
//
// GET  — Fetch all notification rules for a station (active, ordered by priority desc)
// POST — Create a new notification rule
// REQUIRES AUTH + tenant isolation.
//

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createNotificationRuleSchema } from "@/lib/validations/schemas";
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
    const rules = await db.notificationRule.findMany({
      where: {
        stationId,
        deletedAt: null,
      },
      orderBy: { priority: "desc" },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Erreur lors de la récupération des règles:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────────

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

    const parsed = createNotificationRuleSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Validation échouée." },
        { status: 400 }
      );
    }

    const rule = await db.notificationRule.create({
      data: {
        ...parsed.data,
        stationId,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la règle:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
