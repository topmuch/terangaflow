import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/stations/public - Return active stations for the registration form (no auth needed)
export async function GET() {
  try {
    const stations = await db.station.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        country: true,
        _count: {
          select: {
            merchants: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: stations,
    })
  } catch (error) {
    console.error('[API /stations/public GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stations' },
      { status: 500 }
    )
  }
}
