import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * Public API route for merchant landing page.
 * No auth required — accessible via QR code scan.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
): Promise<NextResponse> {
  const { merchantId } = await params;

  try {
    const merchant = await db.merchant.findFirst({
      where: { id: merchantId, deletedAt: null, isActive: true },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Partenaire introuvable." },
        { status: 404 }
      );
    }

    // Check if promo is still valid
    const hasActivePromo =
      merchant.promoText &&
      (!merchant.promoExpiry || merchant.promoExpiry > new Date());

    return NextResponse.json({
      id: merchant.id,
      name: merchant.name,
      description: merchant.description,
      category: merchant.category,
      whatsapp: merchant.whatsapp,
      mapsUrl: merchant.mapsUrl,
      promoText: hasActivePromo ? merchant.promoText : null,
      logo: merchant.logo,
      station: merchant.station,
      createdAt: merchant.createdAt,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du partenaire public:", error);
    return NextResponse.json(
      { error: "Erreur interne." },
      { status: 500 }
    );
  }
}
