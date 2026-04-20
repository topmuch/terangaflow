import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/subscriptions - List subscriptions for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'tenantId is required' }, { status: 400 })
    }

    const subscriptions = await db.subscription.findMany({
      where: { tenantId },
      include: {
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get current active subscription
    const activeSub = subscriptions.find((s) => s.status === 'ACTIVE' || s.status === 'TRIALING')

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        active: activeSub || null,
      },
    })
  } catch (error) {
    console.error('[API /subscriptions GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}

// POST /api/subscriptions - Create/update subscription
// TODO: Intégrer Stripe pour le paiement réel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, plan, months } = body

    if (!tenantId || !plan) {
      return NextResponse.json({ success: false, error: 'tenantId and plan are required' }, { status: 400 })
    }

    const planConfig: Record<string, { amount: number; label: string }> = {
      ANALYTICS: { amount: 4900, label: 'Analytics Premium' },
      MARKETPLACE: { amount: 2900, label: 'Marketplace' },
      WELCOME_PACK: { amount: 9900, label: 'Pack Bienvenue' },
      WHITE_LABEL: { amount: 19900, label: 'White Label' },
    }

    const config = planConfig[plan] || planConfig.ANALYTICS
    const numMonths = months || 1
    const totalAmount = config.amount * numMonths

    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + numMonths)

    // Deactivate existing subscriptions for this tenant
    await db.subscription.updateMany({
      where: { tenantId, status: { in: ['ACTIVE', 'TRIALING'] } },
      data: { status: 'CANCELLED' },
    })

    const subscription = await db.subscription.create({
      data: {
        tenantId,
        plan,
        status: 'ACTIVE',
        currentPeriodStart: startDate,
        currentPeriodEnd: endDate,
      },
    })

    // Create invoice
    const invoice = await db.invoice.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        amount: totalAmount,
        currency: 'XOF',
        status: 'PAID', // Mock payment
        description: `${config.label} - ${numMonthStr(numMonths)}`,
        dueDate: endDate,
        paidAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: { subscription, invoice } }, { status: 201 })
  } catch (error) {
    console.error('[API /subscriptions POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create subscription' }, { status: 500 })
  }
}

function numMonthStr(n: number): string {
  if (n === 1) return '1 mois'
  if (n === 12) return '12 mois'
  return `${n} mois`
}
