import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/rgpd/export — Export all personal data for a user (RGPD Art. 20)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId est requis' },
        { status: 400 }
      )
    }

    // 1. Fetch user profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            settings: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // 2. Fetch activity logs
    const activityLogs = await db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // 3. Fetch API keys (excluding the raw key value for security)
    const apiKeys = await db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        stationId: true,
        station: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 4. Fetch API usage logs (via the user's API keys)
    const apiKeyIds = apiKeys.map((k) => k.id)
    const apiUsageLogs = await db.apiUsageLog.findMany({
      where: { apiKeyId: { in: apiKeyIds } },
      orderBy: { createdAt: 'desc' },
    })

    // 5. Fetch tenant-related data if user belongs to a tenant
    let tenantData: Record<string, unknown> | null = null
    if (user.tenantId) {
      const [subscriptions, invoices] = await Promise.all([
        db.subscription.findMany({
          where: { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' },
        }),
        db.invoice.findMany({
          where: { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' },
        }),
      ])

      tenantData = {
        subscriptions,
        invoices,
      }
    }

    // 6. Compile export data organized by category
    const exportData = {
      exportMeta: {
        generatedAt: new Date().toISOString(),
        userId,
        format: 'SmartTicketQR RGPD Export v1.0',
        article: 'RGPD Article 20 — Droit à la portabilité',
      },
      profilUtilisateur: {
        ...user,
      },
      historiqueActivite: {
        description: 'Journal de toutes les actions effectuées par l\'utilisateur',
        totalEntrees: activityLogs.length,
        donnees: activityLogs,
      },
      clesApi: {
        description: 'Clés API associées à l\'utilisateur',
        totalCles: apiKeys.length,
        donnees: apiKeys,
      },
      utilisationApi: {
        description: 'Journal d\'utilisation des API via les clés de l\'utilisateur',
        totalRequetes: apiUsageLogs.length,
        totalAppels: apiUsageLogs.reduce((sum, log) => sum + log.callsCount, 0),
        donnees: apiUsageLogs,
      },
      donneesTenant: tenantData
        ? {
            description: 'Données liées à l\'organisation de l\'utilisateur',
            ...tenantData,
          }
        : null,
    }

    return NextResponse.json({
      success: true,
      data: exportData,
    })
  } catch (error) {
    console.error('[API /rgpd/export POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de l\'export des données' },
      { status: 500 }
    )
  }
}
