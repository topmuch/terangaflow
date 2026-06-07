import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { constructWebhookEvent } from "@/lib/stripe";
import type { PlanType } from "@/lib/planFeatures";

// ─── In-memory event dedup (prevents double-processing within same process) ─────
// In production, use a DB table or Redis. For SQLite dev, in-memory is fine.

const processedEvents = new Map<string, number>(); // eventId → timestamp
const EVENT_DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isEventProcessed(eventId: string): boolean {
  const ts = processedEvents.get(eventId);
  if (ts && Date.now() - ts < EVENT_DEDUP_WINDOW_MS) {
    return true;
  }
  if (ts) {
    processedEvents.delete(eventId);
  }
  return false;
}

function markEventProcessed(eventId: string): void {
  processedEvents.set(eventId, Date.now());
}

// Periodically clean old entries
setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of processedEvents) {
    if (now - ts >= EVENT_DEDUP_WINDOW_MS) {
      processedEvents.delete(id);
    }
  }
}, 60_000);

// ─── Type-safe data extraction helpers ───────────────────────────────────────────

interface StripeSubscriptionData {
  id: string;
  status: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at?: number;
  canceled_at?: number;
  plan?: {
    id: string;
    amount?: number;
  };
  metadata?: Record<string, string>;
}

interface StripeCheckoutData {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  metadata?: Record<string, string>;
  customer_email?: string | null;
}

function getSubscriptionData(obj: unknown): StripeSubscriptionData | null {
  if (typeof obj !== "object" || obj === null) return null;
  const s = obj as Record<string, unknown>;
  return {
    id: typeof s.id === "string" ? s.id : "",
    status: typeof s.status === "string" ? s.status : "",
    current_period_start: typeof s.current_period_start === "number" ? s.current_period_start : undefined,
    current_period_end: typeof s.current_period_end === "number" ? s.current_period_end : undefined,
    cancel_at: typeof s.cancel_at === "number" ? s.cancel_at : undefined,
    canceled_at: typeof s.canceled_at === "number" ? s.canceled_at : undefined,
    plan: typeof s.plan === "object" && s.plan !== null ? s.plan as Record<string, unknown> : undefined,
    metadata: typeof s.metadata === "object" && s.metadata !== null ? s.metadata as Record<string, string> : undefined,
  };
}

function getCheckoutData(obj: unknown): StripeCheckoutData | null {
  if (typeof obj !== "object" || obj === null) return null;
  const c = obj as Record<string, unknown>;
  return {
    id: typeof c.id === "string" ? c.id : "",
    customer: typeof c.customer === "string" ? c.customer : null,
    subscription: typeof c.subscription === "string" ? c.subscription : null,
    metadata: typeof c.metadata === "object" && c.metadata !== null ? c.metadata as Record<string, string> : undefined,
    customer_email: typeof c.customer_email === "string" ? c.customer_email : null,
  };
}

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events:
 * - checkout.session.completed → Create/activate subscription
 * - customer.subscription.updated → Update plan, dates, status
 * - customer.subscription.deleted → Cancel subscription
 * - invoice.payment_failed → Mark as PAST_DUE
 *
 * All handlers are idempotent (check existing state before writing).
 * Returns 200 always to prevent Stripe retries.
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");
    const body = await request.text();

    const event = constructWebhookEvent(body, signature);

    if (!event) {
      console.error("[Stripe Webhook] Failed to construct event.");
      return NextResponse.json(
        { received: true, error: "Invalid event" },
        { status: 400 }
      );
    }

    // Idempotency check
    if (isEventProcessed(event.id)) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping.`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    const eventType = event.type;

    switch (eventType) {
      case "checkout.session.completed": {
        await handleCheckoutComplete(event);
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event);
        break;
      }
      case "invoice.payment_failed": {
        await handlePaymentFailed(event);
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${eventType}`);
    }

    markEventProcessed(event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    // Always return 200 to prevent Stripe retries on our errors
    return NextResponse.json({ received: true });
  }
}

// ─── Event handlers ──────────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 * Create or update BillingSubscription to ACTIVE status.
 */
async function handleCheckoutComplete(event: Stripe.Event): Promise<void> {
  const data = getCheckoutData(event.data.object);
  if (!data) {
    console.error("[Webhook] checkout.session.completed: invalid data");
    return;
  }

  const tenantId = data.metadata?.tenantId;
  const plan = (data.metadata?.plan ?? "starter") as PlanType;
  const stripeCustomerId = data.customer;
  const stripeSubscriptionId = data.subscription;

  if (!tenantId) {
    console.error("[Webhook] checkout.session.completed: no tenantId in metadata");
    return;
  }

  // Upsert subscription (idempotent)
  const existing = await db.billingSubscription.findFirst({ where: { tenantId } });

  if (existing && existing.status === "ACTIVE") {
    // Already active — avoid unnecessary write
    console.log(`[Webhook] Subscription already ACTIVE for tenant ${tenantId}`);
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await db.billingSubscription.upsert({
    where: { id: existing?.id ?? "" },
    create: {
      tenantId,
      stripeCustomerId: stripeCustomerId ?? null,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
      plan,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      stripeCustomerId: stripeCustomerId ?? undefined,
      stripeSubscriptionId: stripeSubscriptionId ?? undefined,
      plan,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
    },
  });

  // Update tenant plan
  await db.tenant.update({
    where: { id: tenantId },
    data: { plan },
  });

  console.log(`[Webhook] Subscription activated for tenant ${tenantId}, plan=${plan}`);
}

/**
 * customer.subscription.updated
 * Update plan, period dates, and status.
 */
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const data = getSubscriptionData(event.data.object);
  if (!data) {
    console.error("[Webhook] customer.subscription.updated: invalid data");
    return;
  }

  const plan = (data.metadata?.plan ?? "free") as PlanType;
  const stripeSubscriptionId = data.id;

  // Find by Stripe subscription ID
  const existing = await db.billingSubscription.findFirst({
    where: { stripeSubscriptionId },
  });

  if (!existing) {
    console.warn(
      `[Webhook] customer.subscription.updated: no subscription found for stripeSubscriptionId=${stripeSubscriptionId}`
    );
    return;
  }

  const updates: Record<string, unknown> = {};

  if (data.status) updates.status = data.status.toUpperCase();
  if (plan) updates.plan = plan;
  if (data.current_period_start) updates.currentPeriodStart = new Date(data.current_period_start * 1000);
  if (data.current_period_end) updates.currentPeriodEnd = new Date(data.current_period_end * 1000);

  // If cancellation was reversed (canceled_at removed)
  if (data.canceled_at === undefined) {
    updates.cancelledAt = null;
  }

  await db.billingSubscription.update({
    where: { id: existing.id },
    data: updates,
  });

  // Sync tenant plan
  await db.tenant.update({
    where: { id: existing.tenantId },
    data: { plan },
  });

  console.log(`[Webhook] Subscription updated: ${stripeSubscriptionId}, status=${data.status}`);
}

/**
 * customer.subscription.deleted
 * Set status to CANCELLED, set cancelledAt.
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const data = getSubscriptionData(event.data.object);
  if (!data) {
    console.error("[Webhook] customer.subscription.deleted: invalid data");
    return;
  }

  const stripeSubscriptionId = data.id;

  const existing = await db.billingSubscription.findFirst({
    where: { stripeSubscriptionId },
  });

  if (!existing) {
    console.warn(
      `[Webhook] customer.subscription.deleted: no subscription found for stripeSubscriptionId=${stripeSubscriptionId}`
    );
    return;
  }

  // Already cancelled — skip
  if (existing.status === "CANCELLED") {
    console.log(`[Webhook] Subscription already CANCELLED: ${stripeSubscriptionId}`);
    return;
  }

  await db.billingSubscription.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  // Revert tenant to free plan
  await db.tenant.update({
    where: { id: existing.tenantId },
    data: { plan: "free" },
  });

  console.log(`[Webhook] Subscription cancelled: ${stripeSubscriptionId}`);
}

/**
 * invoice.payment_failed
 * Set status to PAST_DUE.
 */
async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  // The invoice object contains a subscription field
  const invoiceData = event.data.object as Record<string, unknown>;
  const stripeSubscriptionId =
    typeof invoiceData.subscription === "string"
      ? (invoiceData.subscription as string)
      : null;

  if (!stripeSubscriptionId) {
    console.error("[Webhook] invoice.payment_failed: no subscription ID in invoice");
    return;
  }

  const existing = await db.billingSubscription.findFirst({
    where: { stripeSubscriptionId },
  });

  if (!existing) {
    console.warn(
      `[Webhook] invoice.payment_failed: no subscription found for stripeSubscriptionId=${stripeSubscriptionId}`
    );
    return;
  }

  // Already PAST_DUE — skip
  if (existing.status === "PAST_DUE") {
    console.log(`[Webhook] Subscription already PAST_DUE: ${stripeSubscriptionId}`);
    return;
  }

  await db.billingSubscription.update({
    where: { id: existing.id },
    data: {
      status: "PAST_DUE",
    },
  });

  console.log(`[Webhook] Payment failed, set PAST_DUE: ${stripeSubscriptionId}`);
}
