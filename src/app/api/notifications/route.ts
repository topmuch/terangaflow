import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/notifications - Get push subscriptions and notification logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const type = searchParams.get('type') // 'subscriptions' | 'logs'

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'stationId is required' }, { status: 400 })
    }

    if (type === 'subscriptions') {
      const subs = await db.pushSubscription.findMany({
        where: { stationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return NextResponse.json({ success: true, data: subs })
    }

    const logs = await db.notificationLog.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('[API /notifications GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST /api/notifications - Send a push notification (mock)
// TODO: Intégrer Firebase Cloud Messaging
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stationId, title, body: message, type, targetAll } = body

    if (!stationId || !title) {
      return NextResponse.json({ success: false, error: 'stationId and title are required' }, { status: 400 })
    }

    // Count push subscriptions for this station
    const subscriptionCount = await db.pushSubscription.count({
      where: { stationId, isActive: true },
    })

    // Log the notification (in production, this would actually send via FCM)
    const log = await db.notificationLog.create({
      data: {
        stationId,
        title,
        body: message || title,
        type: type || 'INFO',
        sentCount: targetAll ? subscriptionCount : 0,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: log.id,
        sentCount: log.sentCount,
        message: targetAll
          ? `Notification envoyée à ${subscriptionCount} abonné(s) (mock FCM)`
          : 'Notification créée (envoi sélectif non supporté en mode démo)',
      },
    })
  } catch (error) {
    console.error('[API /notifications POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 })
  }
}
