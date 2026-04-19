import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/analytics/overview - Dashboard analytics (views, scans, schedule stats)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'stationId is required' }, { status: 400 })
    }

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - 7)

    const [
      todayViews,
      weekViews,
      todayScans,
      totalSchedules,
      activeSchedules,
      delayedSchedules,
      boardingSchedules,
      cancelledToday,
      recentEvents,
    ] = await Promise.all([
      db.displayEvent.count({
        where: { stationId, eventType: 'VIEW', createdAt: { gte: startOfDay } },
      }),
      db.displayEvent.count({
        where: { stationId, eventType: 'VIEW', createdAt: { gte: startOfWeek } },
      }),
      db.qrScan.count({
        where: { stationId, createdAt: { gte: startOfDay } },
      }),
      db.schedule.count({
        where: { stationId, deletedAt: null },
      }),
      db.schedule.count({
        where: { stationId, deletedAt: null, status: { in: ['SCHEDULED', 'BOARDING', 'DELAYED'] } },
      }),
      db.schedule.count({
        where: { stationId, deletedAt: null, status: 'DELAYED' },
      }),
      db.schedule.count({
        where: { stationId, deletedAt: null, status: 'BOARDING' },
      }),
      db.schedule.count({
        where: { stationId, deletedAt: null, status: 'CANCELLED' },
      }),
      db.displayEvent.findMany({
        where: { stationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        today: { views: todayViews, scans: todayScans, cancelled: cancelledToday },
        week: { views: weekViews },
        schedules: { total: totalSchedules, active: activeSchedules, delayed: delayedSchedules, boarding: boardingSchedules },
        recentEvents,
      },
    })
  } catch (error) {
    console.error('[API /analytics/overview] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
