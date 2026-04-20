import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/departures - Get real-time departures/arrivals for a station
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const typeParam = searchParams.get('type')
    const limitParam = searchParams.get('limit')
    const status = searchParams.get('status') || undefined

    // Validate stationId
    if (!stationId || stationId.length < 1) {
      return NextResponse.json(
        { success: false, error: 'stationId is required' },
        { status: 400 }
      )
    }

    const type = typeParam === 'ARRIVALS' ? 'ARRIVALS' : 'DEPARTURES'
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100)

    // Fetch schedules with line and platform info
    const schedules = await db.schedule.findMany({
      where: {
        stationId,
        deletedAt: null,
        ...(status ? { status } : { status: { in: ['SCHEDULED', 'BOARDING', 'DELAYED'] } }),
      },
      include: {
        line: {
          select: {
            id: true,
            name: true,
            code: true,
            destination: true,
            color: true,
            type: true,
            frequencyMinutes: true,
            priceRange: true,
          },
        },
        platform: {
          select: {
            id: true,
            number: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [{ departureTime: 'asc' }],
      take: limit,
    })

    // Get current time to calculate minutes until departure
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    // Enrich schedules with computed data
    const enrichedSchedules = schedules.map((schedule) => {
      const [hours, minutes] = schedule.departureTime.split(':').map(Number)
      let scheduleMinutes = hours * 60 + minutes
      // Handle overnight (e.g., 23:59 -> 00:30)
      if (scheduleMinutes < currentMinutes - 720) {
        scheduleMinutes += 1440
      }
      let minutesUntil = scheduleMinutes - currentMinutes
      if (minutesUntil < -60) minutesUntil += 1440

      const adjustedDepartureTime = schedule.delayMinutes > 0
        ? (() => {
            let adj = scheduleMinutes + schedule.delayMinutes
            if (adj >= 1440) adj -= 1440
            return `${String(Math.floor(adj / 60)).padStart(2, '0')}:${String(adj % 60).padStart(2, '0')}`
          })()
        : schedule.departureTime

      return {
        id: schedule.id,
        line: schedule.line,
        platform: schedule.platform,
        departureTime: schedule.departureTime,
        adjustedDepartureTime,
        minutesUntil,
        status: schedule.status,
        delayMinutes: schedule.delayMinutes,
        vehicleNumber: schedule.vehicleNumber,
        isUrgent: minutesUntil >= 0 && minutesUntil <= 10 && schedule.status !== 'DEPARTED' && schedule.status !== 'CANCELLED',
      }
    })

    // Sort by urgency and time
    const sorted = enrichedSchedules.sort((a, b) => {
      // Boarding first, then by time
      const statusOrder: Record<string, number> = { BOARDING: 0, DELAYED: 1, SCHEDULED: 2 }
      const aOrder = statusOrder[a.status] ?? 3
      const bOrder = statusOrder[b.status] ?? 3
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.minutesUntil - b.minutesUntil
    })

    // Fetch station info
    const station = await db.station.findUnique({
      where: { id: stationId },
      select: { name: true, code: true, city: true, timezone: true },
    })

    // Track display event (anonymized per RGPD)
    await db.displayEvent.create({
      data: {
        stationId,
        eventType: 'VIEW',
        elementId: `departures-${type.toLowerCase()}`,
        metadata: JSON.stringify({ type, count: sorted.length }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        station,
        type,
        schedules: sorted,
        updatedAt: new Date().toISOString(),
        serverTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      },
    })
  } catch (error) {
    console.error('[API /departures] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch departures' },
      { status: 500 }
    )
  }
}
