import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/stations - List all active stations
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
        address: true,
        timezone: true,
        lat: true,
        lng: true,
        settings: true,
        _count: {
          select: {
            lines: true,
            platforms: true,
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
    console.error('[API /stations] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stations' },
      { status: 500 }
    )
  }
}
