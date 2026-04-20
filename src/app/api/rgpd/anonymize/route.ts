import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { requireAuth } from '@/lib/auth-helper'

// POST /api/rgpd/anonymize — Anonymize user personal data (RGPD Art. 17)
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId est requis' },
        { status: 400 }
      )
    }

    // 1. Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // 2. Generate anonymized values
    const anonymizedEmail = `anonymized_${createHash('sha256').update(user.email).digest('hex').substring(0, 12)}@rgpd.smartticketqr.sn`
    const anonymizedName = `Utilisateur anonymisé`
    const anonymizedImage = null

    // 3. Log the anonymization action BEFORE performing it (so we capture the original info in metadata)
    await db.activityLog.create({
      data: {
        userId,
        action: 'RGPD_ANONYMIZATION',
        target: userId,
        metadata: JSON.stringify({
          reason: 'Demande d\'anonymisation RGPD Art. 17',
          anonymizedAt: new Date().toISOString(),
          fieldsAnonymized: ['email', 'name', 'image'],
        }),
      },
    })

    // 4. Anonymize user data (keep account active, remove PII)
    await db.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        name: anonymizedName,
        image: anonymizedImage,
        lastLogin: null,
      },
    })

    // 5. Revoke all active API keys for the user (soft delete)
    await db.apiKey.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    })

    // 6. Remove IP addresses from activity logs
    await db.activityLog.updateMany({
      where: { userId },
      data: { ipAddress: null },
    })

    return NextResponse.json({
      success: true,
      message: 'Données personnelles anonymisées avec succès',
      data: {
        userId,
        anonymizedAt: new Date().toISOString(),
        fieldsAnonymized: ['email', 'name', 'image', 'lastLogin', 'ipAddresses', 'apiKeys'],
        accountStatus: user.isActive ? 'ACTIF' : 'INACTIF',
      },
    })
  } catch (error) {
    console.error('[API /rgpd/anonymize POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de l\'anonymisation des données' },
      { status: 500 }
    )
  }
}
