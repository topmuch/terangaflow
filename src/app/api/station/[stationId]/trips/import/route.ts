import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, verifyStationAccess } from "@/lib/api-auth";
import { csvRowSchema } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";

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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Fichier CSV requis (champ 'file')." },
        { status: 400 }
      );
    }

    const rawText = await file.text();
    const rows = rawText.split("\n").map((line) =>
      line.split(",").map((cell) => cell.trim())
    );

    // Skip header row
    const dataRows = rows.slice(1);

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: "Le fichier CSV est vide ou ne contient que l'en-tête." },
        { status: 400 }
      );
    }

    // Pre-fetch all active lines for this station
    const stationLines = await db.line.findMany({
      where: { stationId, deletedAt: null },
    });

    const lineMap = new Map<string, string>();
    for (const line of stationLines) {
      lineMap.set(line.code, line.id);
    }

    let created = 0;
    let skipped = 0;

    for (const row of dataRows) {
      // Skip empty rows
      if (row.length < 4 || row.every((cell) => cell === "")) {
        skipped++;
        continue;
      }

      try {
        const validated = csvRowSchema.parse({
          lineCode: row[0],
          operatorName: row[1],
          departureTime: row[2],
          durationMinutes: row[3],
          platform: row[4],
          status: row[5],
        });

        // Find line by code
        const lineId = lineMap.get(validated.lineCode);
        if (!lineId) {
          skipped++;
          continue;
        }

        // Parse departure time (HH:MM) and compute arrival
        const [hours, minutes] = validated.departureTime.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          skipped++;
          continue;
        }

        // Use today's date with the specified time
        const today = new Date();
        const departureDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hours,
          minutes,
          0
        );

        // Compute estimated arrival
        const arrivalDate = new Date(
          departureDate.getTime() + validated.durationMinutes * 60 * 1000
        );

        await db.trip.create({
          data: {
            lineId,
            operatorName: validated.operatorName,
            departureTime: departureDate,
            estimatedArrival: arrivalDate,
            status: validated.status,
            platform: validated.platform || null,
          },
        });

        created++;
      } catch {
        skipped++;
      }
    }

    revalidatePath(`/dashboard/${stationId}`);
    return NextResponse.json({
      message: `Import terminé : ${created} trajets créés, ${skipped} ignorés.`,
      created,
      skipped,
    });
  } catch (error) {
    console.error("Erreur lors de l'import CSV:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import du fichier CSV." },
      { status: 500 }
    );
  }
}
