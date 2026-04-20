import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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
      password,
      planType,
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

    // Validate planType if provided
    const VALID_PLAN_TYPES = ['FREE', 'WELCOME_PACK', 'PREMIUM']
    const resolvedPlanType = planType || 'FREE'
    if (!VALID_PLAN_TYPES.includes(resolvedPlanType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid planType. Must be one of: ${VALID_PLAN_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Validate password if provided (minimum 4 characters for now)
    if (password && password.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 4 characters' },
        { status: 400 }
      )
    }

    // For WELCOME_PACK plan, email and password are required
    if (resolvedPlanType === 'WELCOME_PACK' && !email) {
      return NextResponse.json(
        { success: false, error: 'Email is required for WELCOME_PACK plan' },
        { status: 400 }
      )
    }

    if (resolvedPlanType === 'WELCOME_PACK' && !password) {
      return NextResponse.json(
        { success: false, error: 'Password is required for WELCOME_PACK plan' },
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

    // 3. Check if email is already taken
    if (email) {
      const existingMerchant = await db.merchant.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
      if (existingMerchant) {
        return NextResponse.json(
          { success: false, error: 'A merchant with this email already exists' },
          { status: 409 }
        )
      }
    }

    // 4. Create the merchant in the database with PENDING status
    // Hash password with bcrypt for secure storage
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null
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
        email: email ? email.trim().toLowerCase() : null,
        password: hashedPassword,
        status: 'PENDING',
        planType: resolvedPlanType,
        // For WELCOME_PACK, subscriptionEnd is set to null (will be set on validation)
        // For FREE plan, no subscription dates needed
        subscriptionStart: resolvedPlanType !== 'FREE' ? null : undefined,
        subscriptionEnd: resolvedPlanType !== 'FREE' ? null : undefined,
        isActive: true,
      },
    })

    // 5. Create a default WelcomePack record linked to this merchant
    await db.welcomePack.create({
      data: {
        stationId,
        merchantId: merchant.id,
        title: `Bienvenue chez ${merchant.name}`,
        description: `Découvrez les offres de ${merchant.name} à ${station.name}`,
        isActive: true,
      },
    })

    // 6. Return the created merchant data
    return NextResponse.json(
      {
        success: true,
        data: merchant,
        message: 'Merchant registered successfully. Your application is pending validation.',
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
