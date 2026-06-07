import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { createCheckoutSchema } from "@/lib/validations/schemas";
import { canChangePlan, type PlanType } from "@/lib/planFeatures";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for a plan upgrade/change.
 * In simulated mode, directly updates the BillingSubscription
 * and returns a mock URL with simulated=true.
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.tenantId) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const tenantId = token.tenantId as string;
    const body = await request.json();

    // Validate request body
    const parsed = createCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { plan, stationId } = parsed.data;

    // Cannot check out to free plan
    if (plan === "free") {
      return NextResponse.json(
        { error: "Impossible de créer une session de paiement pour le plan gratuit." },
        { status: 400 }
      );
    }

    // Get current plan
    const [subscription, tenant] = await Promise.all([
      db.billingSubscription.findFirst({ where: { tenantId } }),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true },
      }),
    ]);

    const currentPlan = (subscription?.plan ?? tenant?.plan ?? "free") as PlanType;

    // Validate plan change
    if (!canChangePlan(currentPlan, plan)) {
      return NextResponse.json(
        { error: `Vous êtes déjà sur le plan ${plan}.` },
        { status: 409 }
      );
    }

    // Build URLs
    const stationSegment = stationId ?? "";
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const successUrl = `${baseUrl}/station/${stationSegment}/billing?success=true`;
    const cancelUrl = `${baseUrl}/station/${stationSegment}/billing?cancelled=true`;

    // In simulated mode, directly update subscription and return mock URL
    if (!isStripeConfigured()) {
      // Upsert BillingSubscription with the new plan
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await db.billingSubscription.upsert({
        where: {
          id: subscription?.id ?? "",
        },
        create: {
          tenantId,
          plan,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          plan,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
      });

      // Also update Tenant.plan
      await db.tenant.update({
        where: { id: tenantId },
        data: { plan },
      });

      // Return mock session
      const mockSession = await createCheckoutSession({
        plan,
        tenantId,
        stationId: stationId ?? undefined,
        successUrl,
        cancelUrl,
      });

      return NextResponse.json({
        url: mockSession.url,
        sessionId: mockSession.sessionId,
        simulated: true,
      });
    }

    // Real Stripe mode
    const session = await createCheckoutSession({
      plan,
      tenantId,
      stationId: stationId ?? undefined,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.sessionId,
      simulated: false,
    });
  } catch (error) {
    console.error("[POST /api/stripe/checkout] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
