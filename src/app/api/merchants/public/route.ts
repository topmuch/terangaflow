import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stationId = searchParams.get('stationId');

  if (!stationId) return NextResponse.json({ merchants: [] });

  const merchants = await db.merchant.findMany({
    where: { stationId, isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      offerText: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  return NextResponse.json({ merchants });
}
