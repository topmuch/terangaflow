import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { createLineSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const lines = await db.line.findMany({
      where: { stationId, deletedAt: null },
      orderBy: { code: "asc" },
    });

    return NextResponse.json(lines);
  } catch (error) {
    console.error("Erreur lors de la récupération des lignes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des lignes." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
): Promise<NextResponse> {
  const { stationId } = await params;

  const auth = await requireAuth();
  if (!auth.success) return auth.error;

  const accessError = await verifyStationAccess(stationId, auth.user.tenantId);
  if (accessError) return accessError;

  try {
    const body = await request.json();
    const validated = createLineSchema.parse(body);

    // Check for duplicate code within the same station
    const existingLine = await db.line.findFirst({
      where: { stationId, code: validated.code, deletedAt: null },
    });

    if (existingLine) {
      return NextResponse.json(
        { error: "Une ligne avec ce code existe déjà pour cette gare." },
        { status: 409 }
      );
    }

    const line = await db.line.create({
      data: {
        name: validated.name,
        code: validated.code,
        isActive: validated.isActive,
        stationId,
      },
    });

    revalidatePath(`/dashboard/${stationId}`);
    return NextResponse.json(line, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Données invalides.", details: error.message },
        { status: 400 }
      );
    }
    console.error("Erreur lors de la création de la ligne:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la ligne." },
      { status: 500 }
    );
  }
}
