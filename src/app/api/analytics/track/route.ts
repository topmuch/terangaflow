import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stationId, eventType, focusZone, userAgent } = body;

    if (!stationId || !eventType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Fire-and-forget insertion — don't block the client
    // In production, use a Queue (Redis/Bull) for better throughput
    db.analyticsEvent
      .create({
        data: {
          stationId,
          eventType,
          focusZone: focusZone || null,
          userAgent: userAgent?.substring(0, 200) || null, // Truncate for safety
        },
      })
      .catch((err) => console.error('Analytics Error:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
