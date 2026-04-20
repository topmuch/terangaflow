import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkRole } from '@/lib/auth-helper'

// POST /api/merchants/suspend - Suspend a merchant
// Requires: SUPERADMIN or STATION_MANAGER role
export async function POST(request: NextRequest) {
  try {
    // ── Security: require authenticated admin/manager ──
    const authErr = checkRole(request, ['SUPERADMIN', 'STATION_MANAGER'])
    if (authErr) return authErr

    const body = await request.json()
    const { merchantId, reason } = body

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'merchantId is required' },
        { status: 400 }
      )
    }

    // 1. Check merchant exists
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    })

    if (!merchant || merchant.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 }
      )
    }

    if (merchant.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, error: 'Merchant is already suspended' },
        { status: 400 }
      )
    }

    // 2. Update merchant status to SUSPENDED
    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        status: 'SUSPENDED',
        // Store suspension reason in a way we can track it
        // Using description or a JSON metadata field if available
      },
    })

    // 3. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: updatedMerchant.id,
          name: updatedMerchant.name,
          status: updatedMerchant.status,
          suspendedAt: updatedMerchant.updatedAt,
          reason: reason || null,
        },
        message: reason
          ? `Merchant "${merchant.name}" has been suspended. Reason: ${reason}`
          : `Merchant "${merchant.name}" has been suspended`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /merchants/suspend POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to suspend merchant' },
      { status: 500 }
    )
  }
}
