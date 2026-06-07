// ─── GET/POST /api/station/[stationId]/notifications/rules ──────────────────────
//
// GET  — Fetch all notification rules for a station (active, ordered by priority desc)
// POST — Create a new notification rule
//

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createNotificationRuleSchema } from "@/lib/validations/schemas";

// ─── GET ────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

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
