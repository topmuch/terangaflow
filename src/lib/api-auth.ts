import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface AuthCheckSuccess {
  success: true;
  user: {
    id: string;
    role: string;
    tenantId: string;
    stationId: string | null;
  };
}

interface AuthCheckFailure {
  success: false;
  error: NextResponse;
}

type AuthCheckResult = AuthCheckSuccess | AuthCheckFailure;

/**
 * Verify authentication and return user info or an error response.
 * Used in all API routes that require auth + RBAC.
 */
export async function requireAuth(): Promise<AuthCheckResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Non authentifié." },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      role: session.user.role,
      tenantId: session.user.tenantId,
      stationId: session.user.stationId,
    },
  };
}

/**
 * Verify the user owns the station (via tenant membership).
 * Returns error response if station not found or not in user's tenant.
 */
export async function verifyStationAccess(
  stationId: string,
  tenantId: string
): Promise<NextResponse | null> {
  const station = await db.station.findFirst({
    where: { id: stationId, tenantId, deletedAt: null },
  });

  if (!station) {
    return NextResponse.json(
      { error: "Gare non trouvée ou accès refusé." },
      { status: 403 }
    );
  }

  return null; // null = access granted
}
