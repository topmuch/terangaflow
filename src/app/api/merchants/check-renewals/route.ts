import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/merchants/check-renewals
// Cron-like endpoint: checks all ACTIVE merchants and updates subscription status.
// - If subscriptionEnd has passed → sets status to EXPIRED, isActive to false
// - If subscriptionEnd is within 7 days and no reminder sent → sets renewalReminderSentAt
// Returns a summary of actions taken.
export async function GET() {
  try {
    const now = new Date()

    // 1. Fetch all ACTIVE merchants with a subscriptionEnd date
    const activeMerchants = await db.merchant.findMany({
      where: {
        status: 'ACTIVE',
        subscriptionEnd: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        subscriptionEnd: true,
        renewalReminderSentAt: true,
      },
    })

    let expiredCount = 0
    let reminderCount = 0
    const expiredMerchants: string[] = []
    const remindedMerchants: string[] = []

    // 2. Process each merchant
    for (const merchant of activeMerchants) {
      if (!merchant.subscriptionEnd) continue

      const daysUntilExpiry = Math.ceil(
        (merchant.subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Expired: subscriptionEnd has passed
      if (daysUntilExpiry <= 0) {
        await db.merchant.update({
          where: { id: merchant.id },
          data: {
            status: 'EXPIRED',
            isActive: false,
          },
        })
        expiredCount++
        expiredMerchants.push(merchant.name)
        console.log(
          `[CHECK-RENEWALS] Merchant "${merchant.name}" (${merchant.id}) EXPIRED. Was ${daysUntilExpiry} days past end date.`
        )
      }
      // Within 7 days and no reminder sent yet
      else if (daysUntilExpiry <= 7 && !merchant.renewalReminderSentAt) {
        await db.merchant.update({
          where: { id: merchant.id },
          data: {
            renewalReminderSentAt: now,
          },
        })
        reminderCount++
        remindedMerchants.push(`${merchant.name} (${daysUntilExpiry}d remaining)`)
        console.log(
          `[CHECK-RENEWALS] Reminder sent for merchant "${merchant.name}" (${merchant.id}). ${daysUntilExpiry} days until expiry.`
        )
      }
    }

    // 3. Return summary
    return NextResponse.json(
      {
        success: true,
        data: {
          checked: activeMerchants.length,
          expired: expiredCount,
          expiredMerchants,
          reminders: reminderCount,
          remindedMerchants,
          checkedAt: now.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /merchants/check-renewals GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check renewal status' },
      { status: 500 }
    )
  }
}
