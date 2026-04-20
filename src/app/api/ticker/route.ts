import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/ticker - Get active ticker messages for a station
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json(
        { success: false, error: 'stationId is required' },
        { status: 400 }
      )
    }

    const messages = await db.tickerMessage.findMany({
      where: {
        stationId,
        isActive: true,
        deletedAt: null,
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: new Date() } },
            ],
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
        ],
      },
      orderBy: { priority: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: messages,
    })
  } catch (error) {
    console.error('[API /ticker] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticker messages' },
      { status: 500 }
    )
  }
}
