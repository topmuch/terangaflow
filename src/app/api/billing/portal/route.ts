import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { createPortalSession, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session so customers can manage
 * their subscription, update payment method, or cancel.
 * In simulated mode, returns a mock portal URL.
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

    // Get current subscription
    const subscription = await db.billingSubscription.findFirst({
      where: { tenantId },
    });

    // No active subscription
    if (!subscription || !subscription.stripeCustomerId) {
      if (!isStripeConfigured()) {
        // Simulated mode: return mock portal URL
        const body = await request.json();
        const returnUrl =
          typeof body.returnUrl === "string"
            ? body.returnUrl
            : "/dashboard";

        const mockPortal = await createPortalSession({
          customerId: `sim_cust_${tenantId}`,
          returnUrl,
        });

        return NextResponse.json({
          url: mockPortal.url,
          simulated: true,
        });
      }

      return NextResponse.json(
        {
          error:
            "Aucun abonnement Stripe trouvé. Veuillez d'abord souscrire à un plan.",
        },
        { status: 404 }
      );
    }

    // Parse return URL from request body
    const body = await request.json();
    const returnUrl =
      typeof body.returnUrl === "string"
        ? body.returnUrl
        : "/dashboard";

    // Create portal session
    const portalSession = await createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
    });

    return NextResponse.json({
      url: portalSession.url,
      simulated: !isStripeConfigured(),
    });
  } catch (error) {
    console.error("[POST /api/billing/portal] Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
