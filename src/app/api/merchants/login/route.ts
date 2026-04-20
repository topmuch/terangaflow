import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// POST /api/merchants/login - Merchant self-login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 1. Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'email and password are required' },
        { status: 400 }
      )
    }

    // 2. Find merchant by email
    const merchant = await db.merchant.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        station: {
          select: { id: true, name: true },
        },
      },
    })

    if (!merchant || merchant.deletedAt) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 3. Check password using bcrypt comparison (supports both hashed and legacy plain-text)
    let passwordValid = false
    if (merchant.password) {
      // Check if password looks like a bcrypt hash (starts with $2)
      if (merchant.password.startsWith('$2')) {
        passwordValid = await bcrypt.compare(password, merchant.password)
      } else {
        // Legacy plain-text fallback — compare and auto-migrate to bcrypt
        passwordValid = merchant.password === password
        if (passwordValid) {
          // Auto-migrate plain-text password to bcrypt hash
          const hashedPassword = await bcrypt.hash(password, 12)
          await db.merchant.update({
            where: { id: merchant.id },
            data: { password: hashedPassword },
          })
        }
      }
    }

    if (!passwordValid) {
      // Log failed attempt
      await db.merchantLogin.create({
        data: {
          merchantId: merchant.id,
          success: false,
        },
      })

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 4. Check merchant status — PENDING merchants cannot log in
    if (merchant.status === 'PENDING') {
      await db.merchantLogin.create({
        data: {
          merchantId: merchant.id,
          success: false,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Your account is pending validation. Please wait for an administrator to approve your registration.',
        },
        { status: 403 }
      )
    }

    // 5. Create MerchantLogin record (successful login)
    const loginRecord = await db.merchantLogin.create({
      data: {
        merchantId: merchant.id,
        success: true,
      },
    })

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          merchantId: merchant.id,
          merchantName: merchant.name,
          stationId: merchant.stationId,
          stationName: merchant.station.name,
          loginAt: loginRecord.createdAt,
        },
        message: `Welcome back, ${merchant.name}!`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API /merchants/login POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process login' },
      { status: 500 }
    )
  }
}
