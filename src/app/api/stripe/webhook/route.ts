import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Stripe not configured
    if (!stripeSecretKey || !webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 501 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature Stripe manquante' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Verification de signature echouee' },
        { status: 400 }
      );
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const stationId = session.metadata?.stationId;
        const planType = session.metadata?.planType;

        if (!stationId || !planType) break;

        const subscriptionId = session.subscription as string;
        const customer = session.customer as string;

        // Fetch the subscription to get the real current_period_end
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

        await db.billingSubscription.upsert({
          where: { stationId },
          create: {
            stationId,
            stripeCustomerId: customer,
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            planType,
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeCustomerId: customer,
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            planType,
            currentPeriodEnd: periodEnd,
          },
        });

        console.log(
          `[Stripe Webhook] Subscription activated: station=${stationId}, plan=${planType}`
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Stripe invoices don't inherit checkout session metadata;
        // look up the subscription to find the stationId.
        const subId = invoice.lines.data[0]?.subscription as string | undefined;

        if (!subId) {
          console.warn(
            '[Stripe Webhook] Invoice has no subscription line, skipping'
          );
          break;
        }

        const billingRecord = await db.billingSubscription.findFirst({
          where: { stripeSubscriptionId: subId },
        });

        if (!billingRecord) {
          console.warn(
            `[Stripe Webhook] No billing subscription found for stripeSubscriptionId=${subId}`
          );
          break;
        }

        await db.invoiceLog.create({
          data: {
            stationId: billingRecord.stationId,
            stripeInvoiceId: invoice.id,
            amountEUR: invoice.amount_paid / 100,
            status: 'paid',
          },
        });

        console.log(
          `[Stripe Webhook] Invoice paid: station=${billingRecord.stationId}, amount=${invoice.amount_paid / 100} EUR`
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        await db.billingSubscription.updateMany({
          where: { stripeSubscriptionId },
          data: { status: 'canceled' },
        });

        console.log(
          `[Stripe Webhook] Subscription canceled: ${stripeSubscriptionId}`
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const newStatus = subscription.status; // active, past_due, unpaid, canceled, trialing
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : undefined;

        const updateData: Record<string, unknown> = { status: newStatus };
        if (periodEnd) {
          updateData.currentPeriodEnd = periodEnd;
        }

        await db.billingSubscription.updateMany({
          where: { stripeSubscriptionId },
          data: updateData,
        });

        console.log(
          `[Stripe Webhook] Subscription updated: ${stripeSubscriptionId}, status=${newStatus}`
        );
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Processing error:', error);
    // Return 500 so Stripe retries delivery for processing failures.
    // Unhandled event types (default case) do NOT throw, so they return 200 above.
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
