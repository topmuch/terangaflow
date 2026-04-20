import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/merchants/featured - Fetch featured/active merchants for the display screen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId || stationId.length < 10 || stationId.includes('{')) {
      return NextResponse.json({ success: true, data: [] })
    }

    const merchants = await db.merchant.findMany({
      where: {
        stationId,
        status: 'ACTIVE',
        isActive: true,
        planType: 'WELCOME_PACK',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        category: true,
        logoUrl: true,
        offerText: true,
        offerCode: true,
        phone: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })

    return NextResponse.json({
      success: true,
      data: merchants,
    })
  } catch (error) {
    console.error('[API /merchants/featured] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch featured merchants' },
      { status: 500 }
    )
  }
}
