import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/merchants/validate - Admin/gestionnaire validates a merchant application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { merchantId } = body

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'merchantId is required' },
        { status: 400 }
      )
    }

    // 1. Check merchant exists and has PENDING status
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        station: {
          select: { id: true, name: true },
        },
      },
    })

    if (!merchant || merchant.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 }
      )
    }

    if (merchant.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot validate merchant with status: ${merchant.status}. Only PENDING merchants can be validated.`,
        },
        { status: 400 }
      )
    }

    // 2. Update merchant: status → ACTIVE, set subscription dates, validation info
    const now = new Date()
    const subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    const updatedMerchant = await db.merchant.update({
      where: { id: merchantId },
      data: {
        status: 'ACTIVE',
        validatedAt: now,
        validatedBy: 'admin',
        subscriptionStart: now,
        subscriptionEnd,
      },
    })

    // 3. Return success response
    return NextResponse.json(
      {
        success: true,
        data: updatedMerchant,
        message: `Merchant "${merchant.name}" has been validated and is now active`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /merchants/validate POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate merchant' },
      { status: 500 }
    )
  }
}
