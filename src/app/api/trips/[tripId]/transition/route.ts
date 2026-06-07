// ─── POST /api/trips/[tripId]/transition ─────────────────────────────────────────
//
// State machine transition endpoint.
// Validates the transition, updates the trip, logs it, and dispatches notifications.
// REQUIRES AUTH + tenant isolation.
//

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { tripTransitionSchema } from "@/lib/validations/schemas";
import { validateTransition } from "@/lib/tripStateMachine";
import { dispatchNotifications, type DispatchContext } from "@/lib/notificationDispatcher";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";

const bodySchema = tripTransitionSchema.omit({ tripId: true });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse> {
  const { tripId } = await params;

  try {
    // ─── AUTH: Verify authentication + tenant ───────────────────────────────
    const auth = await requireAuth();
    if (!auth.success) return auth.error;

    // ─── Parse & validate body ────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide." },
        { status: 400 }
      );
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message ?? "Validation échouée." },
        { status: 400 }
      );
    }

    const { toStatus, reason, platform } = parsed.data;

    // ─── Fetch trip with line (line has stationId) ──────────────────────────────
    const trip = await db.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      include: { line: true },
    });

    if (!trip) {
      return NextResponse.json(
        { error: "Trajet non trouvé." },
        { status: 404 }
      );
    }

    const stationId = trip.line.stationId;

    // ─── TENANT ISOLATION: Verify station belongs to user's tenant ────────────
    const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
    if (accessError) return accessError;

    // ─── Validate state machine transition ────────────────────────────────────
    const validation = validateTransition(trip.status, toStatus);
    if (!validation.valid || !validation.edge) {
      return NextResponse.json(
        { error: validation.error ?? "Transition interdite." },
        { status: 409 }
      );
    }

    // ─── Check required reason ─────────────────────────────────────────────────
    if (validation.edge.requiresReason && !reason) {
      return NextResponse.json(
        { error: "Cette transition nécessite une raison." },
        { status: 400 }
      );
    }

    // ─── Compute delay in minutes (for notification template) ────────────────
    const now = new Date();
    const delayMinutes = Math.max(
      0,
      Math.round((now.getTime() - trip.departureTime.getTime()) / 60000)
    );

    // ─── Update trip status (and platform if provided) ────────────────────────
    const updateData: Record<string, unknown> = {
      status: toStatus,
      updatedAt: new Date(),
    };
    if (platform !== undefined) {
      updateData.platform = platform;
    }

    const updatedTrip = await db.trip.update({
      where: { id: tripId },
      data: updateData,
      include: { line: true },
    });

    // ─── Create transition log ────────────────────────────────────────────────
    const transitionLog = await db.transitionLog.create({
      data: {
        tripId,
        stationId,
        fromStatus: trip.status,
        toStatus,
        triggeredBy: auth.user.id,
        reason: reason ?? null,
      },
    });

    // ─── Dispatch notifications ────────────────────────────────────────────────
    const ctx: DispatchContext = {
      tripId,
      stationId,
      destination: trip.line.name,
      lineCode: trip.line.code,
      lineName: trip.line.name,
      operatorName: trip.operatorName,
      platform: updatedTrip.platform,
      departureTime: trip.departureTime.toISOString(),
      fromStatus: trip.status,
      toStatus,
      delayMinutes,
      triggeredBy: auth.user.id,
      reason: reason,
    };

    const dispatch = await dispatchNotifications(ctx);

    // ─── Response ────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      transitionLog,
      dispatch: {
        rulesMatched: dispatch.rulesMatched,
        announcementsCreated: dispatch.announcementsCreated,
        errors: dispatch.errors,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la transition du trajet:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
