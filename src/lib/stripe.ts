/**
 * Stripe Client Wrapper — TerangaFlow
 *
 * Provides a simulated mode when STRIPE_SECRET_KEY is not configured,
 * so the billing flow works end-to-end in development without real Stripe keys.
 */

import Stripe from "stripe";
import type { PlanType } from "./planFeatures";

// ─── Simulated mode detection ──────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let _simulatedWarningLogged = false;

export function isStripeConfigured(): boolean {
  return typeof STRIPE_SECRET_KEY === "string" && STRIPE_SECRET_KEY.length > 0;
}

// ─── Stripe singleton ──────────────────────────────────────────────────────────

let _stripeClient: Stripe | null = null;

/**
 * Returns the Stripe SDK client if configured, or null in simulated mode.
 */
export function getStripeClient(): Stripe | null {
  if (!isStripeConfigured()) {
    if (!_simulatedWarningLogged) {
      console.warn(
        "[Stripe] STRIPE_SECRET_KEY not configured — running in SIMULATED billing mode."
      );
      _simulatedWarningLogged = true;
    }
    return null;
  }

  if (!_stripeClient) {
    _stripeClient = new Stripe(STRIPE_SECRET_KEY as string, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }

  return _stripeClient;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CheckoutSessionParams {
  plan: PlanType;
  tenantId: string;
  stationId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

// ─── Mock helpers ───────────────────────────────────────────────────────────────

function generateMockSessionId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── createCheckoutSession ───────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session (or a mock one in simulated mode).
 * In simulated mode, returns a URL that points back to the billing page
 * with `simulated=true` query param so the frontend can handle it.
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient();

  if (!stripe) {
    // Simulated mode
    const sessionId = generateMockSessionId();
    const stationId = params.stationId ?? "";
    const url = params.successUrl.includes("?")
      ? `${params.successUrl}&simulated=true&session_id=${sessionId}`
      : `${params.successUrl}?simulated=true&session_id=${sessionId}`;

    return { url, sessionId };
  }

  // Real Stripe mode
  const { plan, tenantId, stationId, customerEmail, successUrl, cancelUrl } = params;

  // Import here to avoid circular dependency
  const { PLAN_PRICES } = await import("./planFeatures");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price: PLAN_PRICES[plan],
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
      stationId: stationId ?? "",
      plan,
    },
    subscription_data: {
      metadata: {
        tenantId,
        plan,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout Session did not return a URL");
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

// ─── constructWebhookEvent ─────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature and return the parsed event.
 * In simulated mode, returns a parsed object from the raw body.
 * Returns null if verification fails (real mode only).
 */
export function constructWebhookEvent(
  body: string,
  signature: string | null
): Stripe.Event | null {
  const stripe = getStripeClient();

  if (!stripe) {
    // Simulated mode: parse raw JSON body
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      // Ensure it has the minimum shape of a Stripe event
      if (typeof parsed.type === "string" && typeof parsed.data === "object" && parsed.data !== null) {
        return parsed as unknown as Stripe.Event;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Real Stripe verification
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn("[Stripe] STRIPE_WEBHOOK_SECRET not set — cannot verify webhook signature.");
    return null;
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature ?? "",
      STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (err) {
    console.error("[Stripe] Webhook signature verification failed:", err);
    return null;
  }
}

// ─── createPortalSession ──────────────────────────────────────────────────────

export interface PortalSessionParams {
  customerId: string;
  returnUrl: string;
}

export interface PortalSessionResult {
  url: string;
}

/**
 * Create a Stripe Customer Portal session.
 * In simulated mode, returns a mock portal URL.
 */
export async function createPortalSession(
  params: PortalSessionParams
): Promise<PortalSessionResult> {
  const stripe = getStripeClient();

  if (!stripe) {
    // Simulated mode
    return {
      url: `${params.returnUrl}?simulated_portal=true`,
    };
  }

  // Real Stripe mode
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return { url: session.url };
}
