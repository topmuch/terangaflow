import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth-helper'

// GET /api/lines - List lines (optionally filtered by stationId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const transporterId = searchParams.get('transporterId')

    const lines = await db.line.findMany({
      where: {
        deletedAt: null,
        ...(stationId ? { stationId } : {}),
        ...(transporterId ? { transporterId } : {}),
      },
      include: {
        station: { select: { id: true, name: true, code: true } },
        _count: { select: { schedules: true, platforms: true } },
      },
      orderBy: { code: 'asc' },
    })

    return NextResponse.json({ success: true, data: lines })
  } catch (error) {
    console.error('[API /lines GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch lines' }, { status: 500 })
  }
}

// POST /api/lines - Create a new line
// Requires: Authenticated user
export async function POST(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const body = await request.json()
    const { name, code, destination, stationId, transporterId, color, type, frequencyMinutes, priceRange } = body

    if (!name || !code || !destination || !stationId) {
      return NextResponse.json(
        { success: false, error: 'name, code, destination, and stationId are required' },
        { status: 400 }
      )
    }

    const line = await db.line.create({
      data: {
        name,
        code: code.toUpperCase(),
        destination,
        stationId,
        transporterId: transporterId || null,
        color: color || '#10b981',
        type: type || 'BUS',
        frequencyMinutes: frequencyMinutes || 30,
        priceRange: priceRange ? JSON.stringify(priceRange) : JSON.stringify({ min: 0, max: 0 }),
      },
    })

    return NextResponse.json({ success: true, data: line }, { status: 201 })
  } catch (error) {
    console.error('[API /lines POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create line' }, { status: 500 })
  }
}

// PATCH /api/lines - Update a line
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

    const updateData: Record<string, unknown> = { ...data }
    if (data.priceRange && typeof data.priceRange === 'object') {
      updateData.priceRange = JSON.stringify(data.priceRange)
    }

    const line = await db.line.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: line })
  } catch (error) {
    console.error('[API /lines PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update line' }, { status: 500 })
  }
}

// DELETE /api/lines - Soft-delete a line
// Requires: Authenticated user
export async function DELETE(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    await db.line.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true, message: 'Line soft-deleted' })
  } catch (error) {
    console.error('[API /lines DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete line' }, { status: 500 })
  }
}
