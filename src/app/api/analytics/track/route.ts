import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── Simple in-memory rate limiter (per IP) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // max 60 events per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodic cleanup of stale entries (every 5 minutes)
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 300_000);
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

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
  } catch {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
