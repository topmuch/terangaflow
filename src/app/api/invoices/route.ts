import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/invoices - List invoices for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'tenantId is required' }, { status: 400 })
    }

    const invoices = await db.invoice.findMany({
      where: { tenantId },
      include: {
        subscription: { select: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Aggregate totals
    const totalPaid = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + i.amount, 0)
    const totalPending = invoices
      .filter((i) => i.status === 'PENDING')
      .reduce((sum, i) => sum + i.amount, 0)

    return NextResponse.json({
      success: true,
      data: { invoices, totalPaid, totalPending },
    })
  } catch (error) {
    console.error('[API /invoices GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
