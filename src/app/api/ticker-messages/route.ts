import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth-helper'

// GET /api/ticker-messages - List ticker messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'stationId is required' }, { status: 400 })
    }

    const messages = await db.tickerMessage.findMany({
      where: { stationId, deletedAt: null },
      orderBy: { priority: 'desc' },
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error('[API /ticker-messages GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch ticker messages' }, { status: 500 })
  }
}

// POST /api/ticker-messages - Create a new ticker message
// Requires: Authenticated user
export async function POST(request: NextRequest) {
  try {
    const authErr = checkAuth(request)
    if (authErr) return authErr
    const body = await request.json()
    const { stationId, content, priority, type, startDate, endDate } = body

    if (!stationId || !content) {
      return NextResponse.json(
        { success: false, error: 'stationId and content are required' },
        { status: 400 }
      )
    }

    const message = await db.tickerMessage.create({
      data: {
        stationId,
        content,
        priority: priority || 0,
        type: type || 'INFO',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    console.error('[API /ticker-messages POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create ticker message' }, { status: 500 })
  }
}

// PATCH /api/ticker-messages - Update a ticker message
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
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const message = await db.tickerMessage.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: message })
  } catch (error) {
    console.error('[API /ticker-messages PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update ticker message' }, { status: 500 })
  }
}

// DELETE /api/ticker-messages - Soft-delete a ticker message
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

    await db.tickerMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true, message: 'Ticker message deleted' })
  } catch (error) {
    console.error('[API /ticker-messages DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete ticker message' }, { status: 500 })
  }
}
