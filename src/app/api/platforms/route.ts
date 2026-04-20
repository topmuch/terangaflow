import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth-helper'

// GET /api/platforms - List platforms (optionally filtered by stationId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    const platforms = await db.platform.findMany({
      where: {
        deletedAt: null,
        ...(stationId ? { stationId } : {}),
      },
      include: {
        station: { select: { id: true, name: true, code: true } },
        line: { select: { id: true, name: true, code: true, color: true } },
        _count: { select: { schedules: true } },
      },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json({ success: true, data: platforms })
  } catch (error) {
    console.error('[API /platforms GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch platforms' }, { status: 500 })
  }
}

// POST /api/platforms - Create a new platform
// Requires: Authenticated user
export async function POST(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const body = await request.json()
    const { number, name, stationId, lineId, type } = body

    if (!number || !stationId) {
      return NextResponse.json(
        { success: false, error: 'number and stationId are required' },
        { status: 400 }
      )
    }

    const platform = await db.platform.create({
      data: {
        number,
        name: name || `Quai ${number}`,
        stationId,
        lineId: lineId || null,
        type: type || 'STANDARD',
      },
    })

    return NextResponse.json({ success: true, data: platform }, { status: 201 })
  } catch (error) {
    console.error('[API /platforms POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create platform' }, { status: 500 })
  }
}

// PATCH /api/platforms - Update a platform
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

    const platform = await db.platform.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: platform })
  } catch (error) {
    console.error('[API /platforms PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update platform' }, { status: 500 })
  }
}
