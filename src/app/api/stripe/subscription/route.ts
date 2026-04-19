import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get('stationId');

    if (!stationId) {
      return NextResponse.json(
        { error: 'Parametre manquant: stationId' },
        { status: 400 }
      );
    }

    const subscription = await db.billingSubscription.findUnique({
      where: { stationId },
    });

    return NextResponse.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('[Stripe Subscription] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation de l\'abonnement' },
      { status: 500 }
    );
  }
}
