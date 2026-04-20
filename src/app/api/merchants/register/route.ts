import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/merchants/register - Public merchant self-registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stationId,
      name,
      category,
      description,
      phone,
      contactUrl,
      logoUrl,
      imageUrl,
      offerText,
      offerCode,
      email,
    } = body

    // 1. Validate required fields
    if (!stationId || !name) {
      return NextResponse.json(
        { success: false, error: 'stationId and name are required' },
        { status: 400 }
      )
    }

    if (!name.trim()) {
      return NextResponse.json(
        { success: false, error: 'name cannot be empty' },
        { status: 400 }
      )
    }

    // Validate category if provided
    const VALID_CATEGORIES = [
      'RESTAURANT',
      'TAXI',
      'HOTEL',
      'SHOP',
      'SERVICE',
      'TRANSPORT',
      'GENERAL',
    ]
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 2. Verify station exists and is active
    const station = await db.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    })

    if (!station || station.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Station not found' },
        { status: 404 }
      )
    }

    if (!station.isActive) {
      return NextResponse.json(
        { success: false, error: 'This station is currently inactive' },
        { status: 400 }
      )
    }

    // 3. Create the merchant in the database
    const merchant = await db.merchant.create({
      data: {
        stationId,
        name: name.trim(),
        category: category || 'GENERAL',
        description: description?.trim() || null,
        phone: phone?.trim() || null,
        contactUrl: contactUrl?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        offerText: offerText?.trim() || null,
        offerCode: offerCode?.trim() || null,
        email: email?.trim() || null,
        isActive: true,
      },
    })

    // 4. Create a default WelcomePack record linked to this merchant
    await db.welcomePack.create({
      data: {
        stationId,
        merchantId: merchant.id,
        title: `Bienvenue chez ${merchant.name}`,
        description: `Découvrez les offres de ${merchant.name} à ${station.name}`,
        isActive: true,
      },
    })

    // 5. Return the created merchant data
    return NextResponse.json(
      {
        success: true,
        data: merchant,
        message: 'Merchant registered successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API /merchants/register POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to register merchant' },
      { status: 500 }
    )
  }
}
