import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/push/campaigns — List recent push campaigns for a station
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

    const campaigns = await db.pushCampaign.findMany({
      where: { stationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ success: true, data: campaigns })
  } catch (error) {
    console.error('[API /push/campaigns GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
