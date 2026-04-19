import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/offers - List offers (filtered by merchantId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')

    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'merchantId is required' }, { status: 400 })
    }

    const offers = await db.offer.findMany({
      where: { merchantId, deletedAt: null },
      include: {
        merchant: { select: { name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: offers })
  } catch (error) {
    console.error('[API /offers GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch offers' }, { status: 500 })
  }
}

// POST /api/offers - Create offer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { merchantId, title, description, discountType, discountValue, startDate, endDate } = body

    if (!merchantId || !title) {
      return NextResponse.json({ success: false, error: 'merchantId and title are required' }, { status: 400 })
    }

    const offer = await db.offer.create({
      data: {
        merchantId, title,
        description: description || null,
        discountType: discountType || 'PERCENTAGE',
        discountValue: discountValue || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    return NextResponse.json({ success: true, data: offer }, { status: 201 })
  } catch (error) {
    console.error('[API /offers POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create offer' }, { status: 500 })
  }
}

// PATCH /api/offers - Update offer
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const updateData: Record<string, unknown> = { ...data }
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const offer = await db.offer.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, data: offer })
  } catch (error) {
    console.error('[API /offers PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update offer' }, { status: 500 })
  }
}

// DELETE /api/offers - Soft-delete offer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    await db.offer.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true, message: 'Offer deleted' })
  } catch (error) {
    console.error('[API /offers DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete offer' }, { status: 500 })
  }
}
