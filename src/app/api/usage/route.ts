import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/usage - Get API usage analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const days = parseInt(searchParams.get('days') || '7', 10)

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'stationId is required' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get usage logs grouped by day
    const usageLogs = await db.apiUsageLog.findMany({
      where: {
        stationId,
        createdAt: { gte: startDate },
      },
      include: {
        apiKey: { select: { name: true, key: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Aggregate by day
    const dailyUsage: Record<string, { calls: number; uniqueKeys: Set<string> }> = {}
    for (let i = days; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyUsage[key] = { calls: 0, uniqueKeys: new Set() }
    }

    let totalCalls = 0
    let totalCost = 0
    for (const log of usageLogs) {
      const day = log.createdAt.toISOString().split('T')[0]
      if (dailyUsage[day]) {
        dailyUsage[day].calls += log.callsCount
        dailyUsage[day].uniqueKeys.add(log.apiKey?.name || 'unknown')
      }
      totalCalls += log.callsCount
      totalCost += log.callsCount * 0.001 // 0.001€ per call
    }

    const chartData = Object.entries(dailyUsage).map(([date, data]) => ({
      date,
      calls: data.calls,
      uniqueKeys: data.uniqueKeys.size,
    }))

    // Get top endpoints
    const endpointStats: Record<string, number> = {}
    for (const log of usageLogs) {
      endpointStats[log.endpoint] = (endpointStats[log.endpoint] || 0) + log.callsCount
    }
    const topEndpoints = Object.entries(endpointStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, calls]) => ({ endpoint, calls }))

    return NextResponse.json({
      success: true,
      data: {
        period: { days, startDate: startDate.toISOString() },
        summary: {
          totalCalls,
          totalCost: Math.round(totalCost * 100) / 100,
          avgCallsPerDay: Math.round(totalCalls / days),
          estimatedMonthlyCost: Math.round(totalCost * (30 / days) * 100) / 100,
        },
        chartData,
        topEndpoints,
      },
    })
  } catch (error) {
    console.error('[API /usage GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch usage' }, { status: 500 })
  }
}
