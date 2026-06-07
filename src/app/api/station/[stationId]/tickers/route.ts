import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { createTickerSchema } from "@/lib/validations/schemas";
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
    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get("isActive");

    const tickers = await db.tickerMessage.findMany({
      where: {
        stationId,
        deletedAt: null,
        ...(isActiveParam !== null
          ? { isActive: isActiveParam === "true" }
          : {}),
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(tickers);
  } catch (error) {
    console.error("Erreur lors de la récupération des messages:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des messages du bandeau." },
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
    const validated = createTickerSchema.parse(body);

    const ticker = await db.tickerMessage.create({
      data: {
        text: validated.text,
        type: validated.type,
        isActive: validated.isActive,
        displayOrder: validated.displayOrder,
        stationId,
      },
    });

    revalidatePath(`/dashboard/${stationId}`);
    return NextResponse.json(ticker, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Données invalides.", details: error.message },
        { status: 400 }
      );
    }
    console.error("Erreur lors de la création du message:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du message." },
      { status: 500 }
    );
  }
}
