import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { PLANS, getPlanLimits, type PlanType } from "@/lib/planFeatures";

/**
 * GET /api/billing/subscription
 *
 * Returns the current billing subscription for the authenticated tenant,
 * including plan details, status, dates, feature list, limits, and usage.
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.tenantId) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const tenantId = token.tenantId as string;

    // Fetch subscription + tenant in parallel
    const [subscription, tenant, stationCount] = await Promise.all([
      db.billingSubscription.findFirst({
        where: { tenantId },
      }),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, name: true },
      }),
      db.station.count({
        where: { tenantId, deletedAt: null },
      }),
    ]);

    const plan = (subscription?.plan ?? tenant?.plan ?? "free") as PlanType;
    const planDef = PLANS[plan];
    const limits = getPlanLimits(plan);

    // Build response
    const response: Record<string, unknown> = {
      plan,
      planName: planDef.name,
      planPrice: planDef.price,
      currency: planDef.currency,
      features: planDef.features,
      highlighted: planDef.highlighted ?? false,
      limits: {
        maxStations: limits.maxStations,
        maxTripsPerDay: limits.maxTripsPerDay,
      },
      usage: {
        stationCount,
        stationLimit: limits.maxStations,
        stationsAtLimit: stationCount >= limits.maxStations,
      },
    };

    if (subscription) {
      response.subscription = {
        id: subscription.id,
        status: subscription.status,
        stripeCustomerId: subscription.stripeCustomerId,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString(),
      };
    } else {
      response.subscription = null;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/billing/subscription] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
