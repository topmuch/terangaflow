import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/merchants/renewal-status?merchantId=xxx
// Returns the merchant's current subscription status with computed fields.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'merchantId query parameter is required' },
        { status: 400 }
      )
    }

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        status: true,
        planType: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        renewalReminderSentAt: true,
        isActive: true,
      },
    })

    if (!merchant || merchant.deletedAt !== null) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Compute derived fields
    const subscriptionEnd = merchant.subscriptionEnd
    const daysRemaining = subscriptionEnd
      ? Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const needsRenewal = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0
    const isExpired = subscriptionEnd !== null && daysRemaining !== null && daysRemaining <= 0

    return NextResponse.json(
      {
        success: true,
        data: {
          id: merchant.id,
          name: merchant.name,
          status: merchant.status,
          planType: merchant.planType,
          subscriptionStart: merchant.subscriptionStart,
          subscriptionEnd: merchant.subscriptionEnd,
          renewalReminderSentAt: merchant.renewalReminderSentAt,
          isActive: merchant.isActive,
          // Computed fields
          daysRemaining,
          needsRenewal,
          isExpired,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /merchants/renewal-status GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch renewal status' },
      { status: 500 }
    )
  }
}
