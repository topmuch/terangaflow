import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// GET /api/stations/branding?stationId=xxx
// Retrieve station branding/white-label fields
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');

    if (!stationId) {
      return NextResponse.json(
        { success: false, error: 'Parametre stationId requis' },
        { status: 400 }
      );
    }

    const station = await db.station.findUnique({
      where: { id: stationId },
      select: {
        id: true,
        name: true,
        customDomain: true,
        brandLogo: true,
        brandColor: true,
        companyName: true,
        isWhiteLabel: true,
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Station non trouvee' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: station,
    });
  } catch (error) {
    console.error('[API /stations/branding GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement du branding' },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH /api/stations/branding
// Update station branding/white-label fields
// Body: { stationId, customDomain?, brandColor?, brandLogo?, companyName?, isWhiteLabel? }
// Requires: Authorization header with a valid user token
// ============================================================

interface PatchBrandingBody {
  stationId: string;
  customDomain?: string | null;
  brandColor?: string | null;
  brandLogo?: string | null;
  companyName?: string | null;
  isWhiteLabel?: boolean | null;
}

export async function PATCH(request: NextRequest) {
  try {
    // ── Auth check: verify caller is authenticated ──
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    // In production, verify JWT token. For demo, accept mock tokens.
    if (!token.startsWith('mock_token_')) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 401 }
      );
    }

    // Extract userId from mock token (format: mock_token_{userId}_{timestamp})
    const tokenParts = token.split('_');
    const userId = tokenParts[2];

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Token invalide: utilisateur introuvable' },
        { status: 401 }
      );
    }

    // Verify user exists and is authorized (SUPERADMIN or STATION_MANAGER)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, tenantId: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé ou inactif' },
        { status: 401 }
      );
    }

    if (!['SUPERADMIN', 'STATION_MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    const body: PatchBrandingBody = await request.json();
    const { stationId, ...fields } = body;

    if (!stationId) {
      return NextResponse.json(
        { success: false, error: 'Parametre stationId requis' },
        { status: 400 }
      );
    }

    // Tenant isolation: non-superadmins can only edit their own tenant's stations
    if (user.role !== 'SUPERADMIN') {
      const station = await db.station.findUnique({
        where: { id: stationId },
        select: { tenantId: true },
      });
      if (station?.tenantId !== user.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Accès refusé: station hors de votre périmètre' },
          { status: 403 }
        );
      }
    }

    // Validate brandColor format (hex)
    if (fields.brandColor !== undefined && fields.brandColor !== null) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(fields.brandColor)) {
        return NextResponse.json(
          { success: false, error: 'Format de couleur invalide (attendu: #RRGGBB)' },
          { status: 400 }
        );
      }
    }

    // Build update payload with only provided fields
    const updateData: Record<string, unknown> = {};
    if (fields.customDomain !== undefined) updateData.customDomain = fields.customDomain;
    if (fields.brandColor !== undefined) updateData.brandColor = fields.brandColor;
    if (fields.brandLogo !== undefined) updateData.brandLogo = fields.brandLogo;
    if (fields.companyName !== undefined) updateData.companyName = fields.companyName;
    if (fields.isWhiteLabel !== undefined) updateData.isWhiteLabel = fields.isWhiteLabel;

    const station = await db.station.update({
      where: { id: stationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        customDomain: true,
        brandLogo: true,
        brandColor: true,
        companyName: true,
        isWhiteLabel: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: station,
    });
  } catch (error) {
    console.error('[API /stations/branding PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise a jour du branding' },
      { status: 500 }
    );
  }
}
