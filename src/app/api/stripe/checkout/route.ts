import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/auth-helper';

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // Demo mode — Stripe not configured
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          url: null,
          demo: true,
          message: 'Stripe non configure. Mode demo active.',
        },
        { status: 200 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    });

    const body = await req.json();
    const { stationId, planType, priceId } = body as {
      stationId: string;
      planType: string;
      priceId: string;
    };

    if (!stationId || !planType || !priceId) {
      return NextResponse.json(
        { error: 'Parametres manquants: stationId, planType, priceId' },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        stationId,
        planType,
      },
      success_url: `${baseUrl}/?billing=success&plan=${planType}`,
      cancel_url: `${baseUrl}/?billing=canceled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation de la session Checkout' },
      { status: 500 }
    );
  }
}
