import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/merchants - List merchants (filtered by stationId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'stationId is required' }, { status: 400 })
    }

    const merchants = await db.merchant.findMany({
      where: { stationId, deletedAt: null },
      include: {
        _count: { select: { qrScans: true, offers: true } },
        offers: {
          where: { isActive: true, deletedAt: null },
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: merchants })
  } catch (error) {
    console.error('[API /merchants GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch merchants' }, { status: 500 })
  }
}

// POST /api/merchants - Create merchant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stationId, name, description, category, logoUrl, website, phone } = body

    if (!stationId || !name) {
      return NextResponse.json({ success: false, error: 'stationId and name are required' }, { status: 400 })
    }

    const merchant = await db.merchant.create({
      data: {
        stationId, name,
        description: description || null,
        category: category || 'GENERAL',
        logoUrl: logoUrl || null,
        website: website || null,
        phone: phone || null,
      },
    })

    return NextResponse.json({ success: true, data: merchant }, { status: 201 })
  } catch (error) {
    console.error('[API /merchants POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create merchant' }, { status: 500 })
  }
}

// PATCH /api/merchants - Update merchant
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const merchant = await db.merchant.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: merchant })
  } catch (error) {
    console.error('[API /merchants PATCH] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update merchant' }, { status: 500 })
  }
}

// DELETE /api/merchants - Soft-delete merchant
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    await db.merchant.update({ where: { id }, data: { deletedAt: new Date() } })
    return NextResponse.json({ success: true, message: 'Merchant deleted' })
  } catch (error) {
    console.error('[API /merchants DELETE] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete merchant' }, { status: 500 })
  }
}
