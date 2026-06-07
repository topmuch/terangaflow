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

// ─── PATCH /api/station/[stationId]/notifications/rules?ruleId=xxx ──────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json(
        { error: "Paramètre ruleId requis." },
        { status: 400 }
      );
    }

    const existing = await db.notificationRule.findFirst({
      where: { id: ruleId, stationId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Règle non trouvée." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedFields = ["name", "triggerFrom", "triggerTo", "channel", "template", "repeatEveryMin", "repeatMaxTimes", "priority", "isActive"] as const;
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) updateData[field] = body[field];
    }

    updateData.updatedAt = new Date();

    const updated = await db.notificationRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la règle:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/station/[stationId]/notifications/rules?ruleId=xxx ──────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json(
        { error: "Paramètre ruleId requis." },
        { status: 400 }
      );
    }

    const existing = await db.notificationRule.findFirst({
      where: { id: ruleId, stationId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Règle non trouvée." },
        { status: 404 }
      );
    }

    await db.notificationRule.update({
      where: { id: ruleId },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de la règle:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
