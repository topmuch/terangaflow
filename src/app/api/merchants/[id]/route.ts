import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/merchants/[id] - Get a single merchant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const merchant = await db.merchant.findUnique({
      where: { id },
      include: {
        station: {
          select: { name: true, city: true, code: true },
        },
        _count: {
          select: { qrScans: true, offers: true },
        },
      },
    })

    if (!merchant || merchant.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: merchant })
  } catch (error) {
    console.error('[API /merchants/[id] GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch merchant' },
      { status: 500 }
    )
  }
}

// PATCH /api/merchants/[id] - Update a merchant by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Only allow specific fields to be updated
    const {
      name,
      description,
      category,
      phone,
      contactUrl,
      logoUrl,
      imageUrl,
      offerText,
      offerCode,
      isActive,
      email,
    } = body

    // Validate category if provided
    if (category) {
      const VALID_CATEGORIES = [
        'RESTAURANT',
        'TAXI',
        'HOTEL',
        'SHOP',
        'SERVICE',
        'TRANSPORT',
        'GENERAL',
      ]
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
          },
          { status: 400 }
        )
      }
    }

    // Check merchant exists
    const existing = await db.merchant.findUnique({
      where: { id },
    })

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // Build update payload with only provided fields
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : name
    if (description !== undefined) updateData.description = description === null ? null : String(description).trim()
    if (category !== undefined) updateData.category = category
    if (phone !== undefined) updateData.phone = phone === null ? null : String(phone).trim()
    if (contactUrl !== undefined) updateData.contactUrl = contactUrl === null ? null : String(contactUrl).trim()
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl === null ? null : String(logoUrl).trim()
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl === null ? null : String(imageUrl).trim()
    if (offerText !== undefined) updateData.offerText = offerText === null ? null : String(offerText).trim()
    if (offerCode !== undefined) updateData.offerCode = offerCode === null ? null : String(offerCode).trim()
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)
    if (email !== undefined) updateData.email = email === null ? null : String(email).trim()

    const merchant = await db.merchant.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: merchant })
  } catch (error) {
    console.error('[API /merchants/[id] PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update merchant' },
      { status: 500 }
    )
  }
}
