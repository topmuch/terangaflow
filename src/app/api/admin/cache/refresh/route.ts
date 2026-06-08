import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { setAllMappings, getAllMappings } from "@/lib/domainCache";

/**
 * POST /api/admin/cache/refresh
 * SUPERADMIN only.
 * Refreshes the in-memory custom domain → station mapping cache.
 * Queries all active stations with a customDomain and populates the domainCache Map.
 */
export async function POST(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  // Only SUPERADMIN can refresh the domain cache
  if (auth.user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Accès refusé. Réservé aux super-administrateurs." },
      { status: 403 }
    );
  }

  try {
    // Fetch all stations with a custom domain configured
    const stations = await db.station.findMany({
      where: {
        customDomain: { not: null },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        customDomain: true,
        brandName: true,
        brandColor: true,
        brandLogoUrl: true,
        brandFaviconUrl: true,
      },
    });

    // Build mappings array and populate the cache
    const mappings = stations
      .filter((station): station is typeof station & { customDomain: string } =>
        station.customDomain !== null
      )
      .map((station) => ({
        hostname: station.customDomain,
        mapping: {
          stationId: station.id,
          brandName: station.brandName,
          brandColor: station.brandColor,
          brandLogoUrl: station.brandLogoUrl,
          brandFaviconUrl: station.brandFaviconUrl,
        },
      }));

    setAllMappings(mappings);

    return NextResponse.json({
      success: true,
      cachedDomains: mappings.length,
      domains: mappings.map((m) => m.hostname),
    });
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du cache de domaines:", error);
    return NextResponse.json(
      { error: "Erreur lors du rafraîchissement du cache." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cache/refresh
 * SUPERADMIN only.
 * Returns current cache state for inspection.
 */
export async function GET(): Promise<NextResponse> {
  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  if (auth.user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "Accès refusé. Réservé aux super-administrateurs." },
      { status: 403 }
    );
  }

  const currentMappings = getAllMappings();

  return NextResponse.json({
    cachedDomains: currentMappings.size,
    domains: Array.from(currentMappings.entries()).map(([hostname, mapping]) => ({
      hostname,
      stationId: mapping.stationId,
      brandName: mapping.brandName,
      brandColor: mapping.brandColor,
    })),
  });
}
