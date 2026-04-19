import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/push/subscribe — Save or update a push subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stationId, lineIds, subscription } = body

    if (!stationId || !subscription) {
      return NextResponse.json(
        { success: false, error: 'stationId and subscription are required' },
        { status: 400 }
      )
    }

    const { endpoint, p256dh, authKey } = subscription

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { success: false, error: 'endpoint, p256dh, and authKey are required' },
        { status: 400 }
      )
    }

    // Upsert using stationId_endpoint composite key
    await db.pushSubscription.upsert({
      where: {
        stationId_endpoint: { stationId, endpoint },
      },
      update: {
        p256dh,
        authKey,
        lineIds: JSON.stringify(lineIds ?? []),
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        stationId,
        endpoint,
        p256dh,
        authKey,
        lineIds: JSON.stringify(lineIds ?? []),
        isActive: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API /push/subscribe POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save push subscription' },
      { status: 500 }
    )
  }
}
