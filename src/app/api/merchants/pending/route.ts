import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { checkRole } from '@/lib/auth-helper'

// GET /api/merchants/pending - List all PENDING merchants (admin dashboard)
// Requires: SUPERADMIN or STATION_MANAGER
export async function GET(request: NextRequest) {
  try {
    // ── Security: require authenticated admin/manager ──
    const authErr = checkRole(request, ['SUPERADMIN', 'STATION_MANAGER'])
    if (authErr) return authErr

    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'PENDING',
      deletedAt: null,
    }

    if (stationId) {
      where.stationId = stationId
    }

    // Fetch pending merchants with station name
    const merchants = await db.merchant.findMany({
      where,
      include: {
        station: {
          select: { id: true, name: true, city: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: merchants,
      count: merchants.length,
    })
  } catch (error) {
    console.error('[API /merchants/pending GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending merchants' },
      { status: 500 }
    )
  }
}
