import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/auth/login - Mock login (replace with NextAuth in production)
// TODO: Intégrer NextAuth.js pour authentification complète
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, type: true },
        },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé ou inactif' },
        { status: 401 }
      )
    }

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        metadata: JSON.stringify({ method: 'mock', role: user.role }),
      },
    })

    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant,
        token: `mock_token_${user.id}_${Date.now()}`,
      },
    })
  } catch (error) {
    console.error('[API /auth/login] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
