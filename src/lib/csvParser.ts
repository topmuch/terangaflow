/**
 * CSV Parser — Lightweight & secure CSV parsing utility
 * Supports comma-separated values with header detection
 */

export interface CsvParseOptions {
  delimiter?: string
  skipEmpty?: boolean
  trimValues?: boolean
  maxRows?: number
}

export interface CsvParseResult<T = Record<string, string>> {
  headers: string[]
  rows: T[]
  totalRows: number
  errors: number
}

/**
 * Parse a CSV string into an array of row objects
 * Headers are normalized: lowercase, spaces → underscores
 */
export function parseCSV<T = Record<string, string>>(
  csv: string,
  options: CsvParseOptions = {}
): CsvParseResult<T> {
  const {
    delimiter = ',',
    skipEmpty = true,
    trimValues = true,
    maxRows = 1000,
  } = options

  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { headers: [], rows: [], totalRows: 0, errors: 0 }
  }

  const rawHeaders = lines[0].split(delimiter)
  const headers = rawHeaders.map((h) =>
    trimValues
      ? h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      : h.trim()
  )

  let errors = 0
  const rows: T[] = []

  for (let i = 1; i < lines.length && rows.length < maxRows; i++) {
    const line = lines[i].trim()
    if (skipEmpty && !line) continue

    const values = line.split(delimiter).map((v) => (trimValues ? v.trim() : v))

    if (values.length === 0 || (values.length === 1 && !values[0])) {
      errors++
      continue
    }

    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })

    rows.push(row as T)
  }

  return {
    headers,
    rows,
    totalRows: lines.length - 1,
    errors,
  }
}

/**
 * Validate a row against required fields
 */
export function validateRow(
  row: Record<string, string>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(
    (field) => !row[field] || row[field].trim() === ''
  )
  return { valid: missing.length === 0, missing }
}

/**
 * Generate a sample CSV template string for schedules import
 */
export function generateScheduleTemplate(): string {
  return `lineCode,departureTime,daysOfWeek,vehicleNumber,platform
D1,06:00,1,DK-1234-AB,1
D1,06:30,1,DK-5678-CD,1
D2,07:00,1,DK-9012-EF,2
D2,07:30,1,DK-3456-GH,2
T12,08:00,1,TR-1111-AB,3
T12,08:45,1,TR-2222-CD,3`
}

/**
 * Download a CSV file from the browser
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
