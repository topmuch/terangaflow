import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params;

    const schedules = await db.schedule.findMany({
      where: {
        stationId,
        deletedAt: null,
      },
      include: {
        line: true,
        platform: true,
      },
      orderBy: { departureTime: 'asc' },
      take: 50,
    });

    const departures = schedules.map((s) => {
      const [hours, minutes] = s.departureTime.split(':').map(Number);
      let estimatedTime = s.departureTime;
      if (s.delayMinutes && s.delayMinutes > 0) {
        const totalMinutes = hours * 60 + minutes + s.delayMinutes;
        estimatedTime = `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
      }

      const status = s.status === 'SCHEDULED' ? 'ON_TIME' : s.status;

      return {
        id: s.id,
        lineCode: s.line.code,
        lineColor: s.line.color,
        destination: s.line.destination,
        scheduledTime: s.departureTime,
        estimatedTime,
        platform: s.platform ? `Quai ${s.platform.number}` : '—',
        status,
        delayMinutes: s.delayMinutes || undefined,
        type: 'departure' as const,
        vehicleNumber: s.vehicleNumber || undefined,
      };
    });

    return NextResponse.json(departures);
  } catch (error) {
    console.error('Departures API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
