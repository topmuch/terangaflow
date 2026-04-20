import { db } from '@/lib/db'
import { redirect } from 'next/navigation'

// ============================================================
// Display redirector — maps domain or stationId to the kiosk page
// This runs in Node.js runtime (not Edge), so Prisma works here.
// ============================================================

export default async function DisplayRedirector({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; stationId?: string }>
}) {
  const params = await searchParams

  // Direct stationId access: /display?stationId=xxx
  if (params.stationId) {
    redirect(`/display/${params.stationId}`)
  }

  // Custom domain access: /display?domain=gare.example.com
  if (params.domain) {
    const station = await db.station.findFirst({
      where: { customDomain: params.domain, isActive: true },
      select: { id: true },
    })

    if (station) {
      redirect(`/display/${station.id}`)
    }
  }

  // No match — redirect to homepage
  redirect('/')
}
