import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/api-keys - List API keys for a user/station
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const stationId = searchParams.get('stationId')

    const keys = await db.apiKey.findMany({
      where: {
        deletedAt: null,
        ...(userId ? { userId } : {}),
        ...(stationId ? { stationId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        station: { select: { id: true, name: true, code: true } },
        _count: { select: { usageLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get recent usage stats per key
    const enriched = await Promise.all(keys.map(async (key) => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const [hourCalls, dayCalls] = await Promise.all([
        db.apiUsageLog.aggregate({
          where: { apiKeyId: key.id, createdAt: { gte: oneHourAgo } },
          _sum: { callsCount: true },
        }),
        db.apiUsageLog.aggregate({
          where: { apiKeyId: key.id, createdAt: { gte: oneDayAgo } },
          _sum: { callsCount: true },
        }),
      ])

      return {
        ...key,
        callsLastHour: hourCalls._sum.callsCount || 0,
        callsLastDay: dayCalls._sum.callsCount || 0,
      }
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('[API /api-keys GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST /api/api-keys - Create API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, stationId, name, rateLimit } = body

    if (!userId || !name) {
      return NextResponse.json({ success: false, error: 'userId and name are required' }, { status: 400 })
    }

    const key = `stkqr_live_${Math.random().toString(36).substring(2, 18)}`
    const apiKey = await db.apiKey.create({
      data: {
        userId, stationId: stationId || null,
        name, key,
        rateLimit: rateLimit || 1000,
      },
    })

    return NextResponse.json({ success: true, data: apiKey }, { status: 201 })
  } catch (error) {
    console.error('[API /api-keys POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create API key' }, { status: 500 })
  }
}

// PATCH /api/api-keys - Update API key
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const apiKey = await db.apiKey.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: apiKey })
  } catch (error) {
    console.error('[API /api-keys PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update API key' }, { status: 500 })
  }
}

// DELETE /api/api-keys - Soft-delete API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    await db.apiKey.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true, message: 'API key deleted' })
  } catch (error) {
    console.error('[API /api-keys DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete API key' }, { status: 500 })
  }
}
