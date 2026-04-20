import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth-helper'

// POST /api/merchants/renew - Merchant renews their subscription
// Requires: Authenticated user
export async function POST(request: NextRequest) {
  try {
    // ── Security: require authenticated user ──
    const authErr = checkAuth(request)
    if (authErr) return authErr

    const body = await request.json()
    const { merchantId, paymentMethod } = body

    // 1. Validate required fields
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'merchantId is required' },
        { status: 400 }
      )
    }

    const VALID_PAYMENT_METHODS = ['orange_money', 'wave', 'card']
    if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid paymentMethod. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 2. Check merchant exists and status is ACTIVE
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    })

    if (!merchant || merchant.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 }
      )
    }

    if (merchant.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot renew subscription for merchant with status: ${merchant.status}. Only ACTIVE merchants can renew.`,
        },
        { status: 400 }
      )
    }

    // 3. Calculate new subscription dates
    const now = new Date()
    // If current subscription hasn't expired, extend from the current end date; otherwise from now
    const baseDate = merchant.subscriptionEnd && merchant.subscriptionEnd > now
      ? new Date(merchant.subscriptionEnd.getTime())
      : now
    const newSubscriptionEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // 4. Build renewal log entry
    const renewalLog = {
      renewedAt: now.toISOString(),
      paymentMethod,
      previousEnd: merchant.subscriptionEnd?.toISOString() || null,
      newEnd: newSubscriptionEnd.toISOString(),
    }

    // 5. Update merchant subscription
    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        subscriptionEnd: newSubscriptionEnd,
        renewalReminderSentAt: null,
        // Store renewal metadata in description if no description exists,
        // otherwise append to it (we use a JSON approach via the description field)
        // Actually, we should use the existing metadata pattern. The schema doesn't
        // have a dedicated metadata JSON field, so we'll rely on the renewalReminderSentAt
        // reset as the main indicator. The renewal log is just for audit purposes.
      },
    })

    // 6. Log the renewal via console (in production, this would go to an audit table)
    console.log(`[RENEWAL] Merchant "${merchant.name}" (${merchantId}) renewed via ${paymentMethod}. New end: ${newSubscriptionEnd.toISOString()}. Log: ${JSON.stringify(renewalLog)}`)

    // 7. Return success response with new subscription dates
    return NextResponse.json(
      {
        success: true,
        data: {
          id: updatedMerchant.id,
          name: updatedMerchant.name,
          status: updatedMerchant.status,
          planType: updatedMerchant.planType,
          subscriptionStart: updatedMerchant.subscriptionStart,
          subscriptionEnd: updatedMerchant.subscriptionEnd,
          paymentMethod,
        },
        message: 'Subscription renewed successfully for 30 days',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /merchants/renew POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to renew subscription' },
      { status: 500 }
    )
  }
}
