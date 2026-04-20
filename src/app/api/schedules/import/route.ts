import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseCSV, validateRow } from '@/lib/csvParser'
import { checkAuth } from '@/lib/auth-helper'

/**
 * POST /api/schedules/import
 * Bulk-import schedules from a CSV string.
 * Requires: Authenticated user
 *
 * Body: { stationId: string, csv: string }
 *
 * CSV expected headers (case-insensitive, auto-normalized):
 *   linecode, departuretime, daysofweek (optional), vehiclenumber (optional)
 *
 * Returns: { success: true, data: { created: number, errors: number, total: number } }
 */
export async function POST(request: NextRequest) {
  try {
    // ── Security: require authenticated user ──
    const authErr = checkAuth(request)
    if (authErr) return authErr

    const body = await request.json()
    const { stationId, csv } = body as {
      stationId?: string
      csv?: string
    }

    // --- Basic validation ---
    if (!stationId || typeof stationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'stationId est requis' },
        { status: 400 }
      )
    }

    if (!csv || typeof csv !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Le contenu CSV est requis' },
        { status: 400 }
      )
    }

    // Verify station exists
    const station = await db.station.findUnique({
      where: { id: stationId },
    })
    if (!station) {
      return NextResponse.json(
        { success: false, error: 'Gare introuvable' },
        { status: 404 }
      )
    }

    // --- Parse CSV ---
    const result = parseCSV(csv, { skipEmpty: true, trimValues: true })
    const { rows, totalRows } = result

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { created: 0, errors: totalRows, total: totalRows },
      })
    }

    // --- Pre-fetch all lines for this station keyed by code ---
    const stationLines = await db.line.findMany({
      where: { stationId, isActive: true },
      select: { id: true, code: true },
    })
    const lineByCode = new Map<string, string>()
    for (const line of stationLines) {
      lineByCode.set(line.code.toUpperCase(), line.id)
    }

    // --- Process rows ---
    let created = 0
    let errors = 0
    const requiredFields = ['linecode', 'departuretime']

    for (const row of rows) {
      try {
        // Validate required fields
        const validation = validateRow(row as Record<string, string>, requiredFields)
        if (!validation.valid) {
          errors++
          continue
        }

        const lineCode = (row.linecode as string).trim()
        const rawTime = (row.departuretime as string).trim()
        const rawDays = (row.daysofweek as string)?.trim()
        const vehicleNumber = (row.vehiclenumber as string)?.trim() || null

        // --- Pad departureTime to HH:mm ---
        const paddedTime = padTime(rawTime)
        if (!paddedTime) {
          errors++
          continue
        }

        // --- Resolve line ---
        const lineId = lineByCode.get(lineCode.toUpperCase())
        if (!lineId) {
          errors++
          continue
        }

        // --- Build schedule data ---
        const daysOfWeek = rawDays && rawDays.length > 0 ? rawDays : '1,2,3,4,5,6,7'

        await db.schedule.create({
          data: {
            lineId,
            stationId,
            departureTime: paddedTime,
            daysOfWeek,
            vehicleNumber: vehicleNumber || undefined,
            status: 'SCHEDULED',
          },
        })

        created++
      } catch {
        // One row failed — skip and continue
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, errors, total: totalRows },
    })
  } catch (error) {
    console.error('[POST /api/schedules/import]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de l\'import' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pad a time string to strict HH:mm format.
 * Accepts "H:mm", "HH:mm", "H:m", "HH:m", "H", "HH".
 * Returns null if the value cannot be parsed.
 */
function padTime(raw: string): string | null {
  if (!raw) return null

  const parts = raw.split(':').map((p) => p.trim())
  let hours: number
  let minutes: number

  if (parts.length === 1) {
    // "H" or "HH" — minutes default to 0
    hours = parseInt(parts[0]!, 10)
    minutes = 0
  } else if (parts.length === 2) {
    hours = parseInt(parts[0]!, 10)
    minutes = parseInt(parts[1]!, 10)
  } else {
    return null
  }

  if (isNaN(hours) || isNaN(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
