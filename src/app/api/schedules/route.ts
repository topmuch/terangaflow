import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth-helper'

// GET /api/schedules - List schedules with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const lineId = searchParams.get('lineId')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200)

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'stationId is required' }, { status: 400 })
    }

    const schedules = await db.schedule.findMany({
      where: {
        stationId,
        deletedAt: null,
        ...(lineId ? { lineId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        line: { select: { id: true, name: true, code: true, destination: true, color: true, type: true } },
        platform: { select: { id: true, number: true, name: true, type: true } },
      },
      orderBy: { departureTime: 'asc' },
      take: limit,
    })

    // Enrich with computed fields
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const enriched = schedules.map((s) => {
      const [h, m] = s.departureTime.split(':').map(Number)
      let schedMin = h * 60 + m
      if (schedMin < currentMinutes - 720) schedMin += 1440
      let minutesUntil = schedMin - currentMinutes
      if (minutesUntil < -60) minutesUntil += 1440

      return {
        ...s,
        minutesUntil,
        isUrgent: minutesUntil >= 0 && minutesUntil <= 10 && s.status !== 'DEPARTED' && s.status !== 'CANCELLED',
      }
    })

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('[API /schedules GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

// POST /api/schedules - Create a new schedule
// Requires: Authenticated user
export async function POST(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const body = await request.json()
    const { lineId, stationId, platformId, departureTime, daysOfWeek, vehicleNumber } = body

    if (!lineId || !stationId || !departureTime) {
      return NextResponse.json(
        { success: false, error: 'lineId, stationId, and departureTime are required' },
        { status: 400 }
      )
    }

    const schedule = await db.schedule.create({
      data: {
        lineId,
        stationId,
        platformId: platformId || null,
        departureTime,
        daysOfWeek: daysOfWeek || '1,2,3,4,5,6,7',
        vehicleNumber: vehicleNumber || null,
      },
    })

    return NextResponse.json({ success: true, data: schedule }, { status: 201 })
  } catch (error) {
    console.error('[API /schedules POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create schedule' }, { status: 500 })
  }
}

// PATCH /api/schedules - Update a schedule
// Requires: Authenticated user
export async function PATCH(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const schedule = await db.schedule.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('[API /schedules PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update schedule' }, { status: 500 })
  }
}

// PUT /api/schedules - Bulk status update
// Requires: Authenticated user
export async function PUT(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const body = await request.json()
    const { stationId, lineId, action, params } = body

    if (!stationId || !action) {
      return NextResponse.json({ success: false, error: 'stationId and action are required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      stationId,
      deletedAt: null,
      status: { in: ['SCHEDULED', 'BOARDING', 'DELAYED'] },
    }
    if (lineId) where.lineId = lineId

    let result
    switch (action) {
      case 'DELAY_ALL':
        result = await db.schedule.updateMany({
          where,
          data: {
            status: 'DELAYED',
            delayMinutes: params?.delayMinutes || 15,
          },
        })
        break
      case 'CANCEL_ALL':
        result = await db.schedule.updateMany({
          where,
          data: { status: 'CANCELLED' },
        })
        break
      case 'RESET_ALL':
        result = await db.schedule.updateMany({
          where: { stationId, deletedAt: null },
          data: { status: 'SCHEDULED', delayMinutes: 0 },
        })
        break
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[API /schedules PUT] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to bulk update schedules' }, { status: 500 })
  }
}

// IMPORT - Import schedules from CSV data
// Requires: Authenticated user
export async function IMPORT(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const body = await request.json()
    const { stationId, schedules } = body

    if (!stationId || !Array.isArray(schedules)) {
      return NextResponse.json({ success: false, error: 'stationId and schedules array are required' }, { status: 400 })
    }

    let created = 0
    let errors = 0

    for (const row of schedules) {
      try {
        if (!row.lineCode || !row.departureTime) {
          errors++
          continue
        }

        // Find line by code within station
        const line = await db.line.findFirst({
          where: { code: row.lineCode.toUpperCase(), stationId, deletedAt: null },
        })

        if (!line) {
          errors++
          continue
        }

        await db.schedule.create({
          data: {
            lineId: line.id,
            stationId,
            departureTime: row.departureTime.padStart(5, '0'),
            daysOfWeek: row.daysOfWeek || '1,2,3,4,5,6,7',
            vehicleNumber: row.vehicleNumber || null,
          },
        })
        created++
      } catch {
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, errors, total: schedules.length },
    })
  } catch (error) {
    console.error('[API /schedules IMPORT] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to import schedules' }, { status: 500 })
  }
}
