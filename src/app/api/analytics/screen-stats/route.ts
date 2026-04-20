import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get('stationId');

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'stationId is required' }, { status: 400 });
    }

    // Stats for the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const [impressions, screenOns, qrScans, clicks] = await Promise.all([
      db.analyticsEvent.count({
        where: {
          stationId,
          eventType: 'impression',
          timestamp: { gte: yesterday },
        },
      }),
      db.analyticsEvent.count({
        where: {
          stationId,
          eventType: 'screen_on',
          timestamp: { gte: yesterday },
        },
      }),
      db.analyticsEvent.count({
        where: {
          stationId,
          eventType: 'qr_scan',
          timestamp: { gte: yesterday },
        },
      }),
      db.analyticsEvent.count({
        where: {
          stationId,
          eventType: 'click',
          timestamp: { gte: yesterday },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { impressions, screenOns, qrScans, clicks },
    });
  } catch (error) {
    console.error('Screen stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
  }
}
