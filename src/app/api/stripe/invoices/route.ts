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

    const invoices = await db.invoiceLog.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('[Stripe Invoices] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recuperation des factures' },
      { status: 500 }
    );
  }
}
