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
    const body: PatchBrandingBody = await request.json();
    const { stationId, ...fields } = body;

    if (!stationId) {
      return NextResponse.json(
        { success: false, error: 'Parametre stationId requis' },
        { status: 400 }
      );
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
