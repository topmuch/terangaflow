import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import webPush from 'web-push'
import { checkRole } from '@/lib/auth-helper'

// POST /api/push/send — Send push notifications in batch
// Requires: SUPERADMIN or STATION_MANAGER role
export async function POST(request: NextRequest) {
  try {
    // ── Security: require authenticated admin/manager ──
    const authErr = checkRole(request, ['SUPERADMIN', 'STATION_MANAGER'])
    if (authErr) return authErr

    const body = await request.json()
    const { stationId, title, body: message, targetLines } = body

    if (!stationId || !title) {
      return NextResponse.json(
        { success: false, error: 'stationId and title are required' },
        { status: 400 }
      )
    }

    // Configure VAPID details
    const email = process.env.VAPID_EMAIL || 'noreply@smartticketqr.com'
    const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY

    if (!publicKey || !privateKey) {
      console.error('[API /push/send] VAPID keys are not configured')
      return NextResponse.json(
        { success: false, error: 'Push notifications are not configured' },
        { status: 500 }
      )
    }

    webPush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)

    // Fetch all active push subscriptions for this station
    const subscriptions = await db.pushSubscription.findMany({
      where: { stationId, isActive: true },
    })

    // Filter subscriptions: include if lineIds is empty (all lines) OR overlaps with targetLines
    const targetSet = new Set<string>(targetLines ?? [])
    const eligibleSubs = subscriptions.filter((sub) => {
      if (targetSet.size === 0) return true
      try {
        const subLines: string[] = JSON.parse(sub.lineIds)
        if (subLines.length === 0) return true // subscribed to all lines
        return subLines.some((line) => targetSet.has(line))
      } catch {
        return true // parse error — include to be safe
      }
    })

    let sentCount = 0
    let failedCount = 0
    const toDelete: string[] = []

    // Send notifications in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      eligibleSubs.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.authKey,
              },
            },
            JSON.stringify({
              title,
              body: message || title,
              url: '/',
              tag: `station-${stationId}`,
            })
          )
          sentCount++
        } catch (err: unknown) {
          failedCount++
          const error = err as { statusCode?: number }
          // Delete subscriptions that are invalid/expired
          if (
            error.statusCode === 401 ||
            error.statusCode === 410 ||
            error.statusCode === 404
          ) {
            toDelete.push(sub.id)
          }
        }
      })
    )

    // Clean up dead subscriptions
    if (toDelete.length > 0) {
      await db.pushSubscription.deleteMany({
        where: { id: { in: toDelete } },
      })
    }

    // Calculate cost
    const cost = sentCount * 0.01

    // Determine campaign status
    let campaignStatus = 'SENT'
    if (sentCount === 0 && failedCount > 0) campaignStatus = 'FAILED'
    else if (failedCount > 0) campaignStatus = 'PARTIAL'

    // Create PushCampaign record
    await db.pushCampaign.create({
      data: {
        stationId,
        title,
        body: message || title,
        targetLines: JSON.stringify(targetLines ?? []),
        status: campaignStatus,
        sentCount,
        failedCount,
        costEUR: cost,
      },
    })

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      cost,
    })
  } catch (error) {
    console.error('[API /push/send POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send push notifications' },
      { status: 500 }
    )
  }
}
