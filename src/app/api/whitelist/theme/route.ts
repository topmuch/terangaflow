// ============================================================
// White Label Theme Persistence API
// ============================================================
// GET  ?tenantId=xxx  — Returns the tenant's saved theme
// POST { tenantId, theme } — Saves the theme to Tenant.settings JSON

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth-helper'

// --- GET: Retrieve tenant's white label theme (public) ---
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Le paramètre tenantId est requis' },
        { status: 400 }
      )
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, settings: true },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Locataire introuvable' },
        { status: 404 }
      )
    }

    let settings: Record<string, unknown> = {}
    try {
      settings = JSON.parse(tenant.settings)
    } catch {
      // Corrupted JSON — start fresh
    }

    const theme = settings.whiteLabelTheme ?? null

    return NextResponse.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      theme,
    })
  } catch (error) {
    console.error('[WHITELABEL GET] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// --- POST: Save tenant's white label theme (protected) ---
export async function POST(request: NextRequest) {
  try {
    requireRole(request, ['SUPERADMIN', 'STATION_MANAGER'])

    const body = await request.json()
    const { tenantId, theme } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Le paramètre tenantId est requis' },
        { status: 400 }
      )
    }

    if (!theme || typeof theme !== 'object') {
      return NextResponse.json(
        { error: 'Le thème est invalide' },
        { status: 400 }
      )
    }

    // Validate required theme fields
    const requiredFields = ['appName', 'primaryColor', 'accentColor']
    for (const field of requiredFields) {
      if (!theme[field]) {
        return NextResponse.json(
          { error: `Le champ "${field}" est requis dans le thème` },
          { status: 400 }
        )
      }
    }

    // Check tenant exists
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, settings: true },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Locataire introuvable' },
        { status: 404 }
      )
    }

    // Merge with existing settings
    let settings: Record<string, unknown> = {}
    try {
      settings = JSON.parse(tenant.settings)
    } catch {
      // Corrupted JSON — start fresh
    }

    settings.whiteLabelTheme = {
      ...theme,
      tenantId, // Ensure tenantId is always set
    }

    // Save
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        settings: JSON.stringify(settings),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Thème enregistré avec succès',
      tenantId,
      theme: settings.whiteLabelTheme,
    })
  } catch (error) {
    console.error('[WHITELABEL POST] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
