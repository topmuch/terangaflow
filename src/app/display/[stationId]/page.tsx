'use client'

import { use, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bus, Clock, MapPin, ArrowRight, Wifi, WifiOff, Store, Gift } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ============================================================
// Types
// ============================================================

interface FeaturedMerchant {
  id: string
  name: string
  category: string
  logoUrl: string | null
  offerText: string | null
  offerCode: string | null
  phone: string | null
}

interface Departure {
  id: string
  line: { id: string; name: string; code: string; destination: string; color: string; type: string }
  platform: { id: string; number: number; name: string; type: string } | null
  departureTime: string
  adjustedDepartureTime: string
  minutesUntil: number
  status: string
  delayMinutes: number
  vehicleNumber: string | null
  isUrgent: boolean
}

interface StationInfo {
  id: string
  name: string
  code: string
  city: string
  country: string
  brandColor?: string | null
  companyName?: string
}

// ============================================================
// Status config
// ============================================================

const statusConfig: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Prévu', color: 'bg-sky-500/15 text-sky-400' },
  BOARDING: { label: 'Embarquement', color: 'bg-emerald-500/15 text-emerald-400' },
  DEPARTED: { label: 'Parti', color: 'bg-zinc-500/15 text-zinc-400' },
  DELAYED: { label: 'Retardé', color: 'bg-amber-500/15 text-amber-400' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-500/15 text-red-400' },
}

const typeIcons: Record<string, React.ElementType> = { BUS: Bus, TRAIN: Clock, FERRY: ArrowRight, TAXI: ArrowRight }

// ============================================================
// Page Component
// ============================================================

export default function DisplayPage({
  params,
}: {
  params: Promise<{ stationId: string }>
}) {
  const { stationId } = use(params)
  const [station, setStation] = useState<StationInfo | null>(null)
  const [departures, setDepartures] = useState<Departure[]>([])
  const [featuredMerchants, setFeaturedMerchants] = useState<FeaturedMerchant[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [currentTime, setCurrentTime] = useState('')

  // Fetch station + departures
  useEffect(() => {
    async function fetchData() {
      try {
        const [stationRes, departuresRes] = await Promise.all([
          fetch(`/api/stations?stationId=${stationId}`),
          fetch(`/api/departures?stationId=${stationId}&limit=20`),
        ])

        if (stationRes.ok) {
          const stationJson = await stationRes.json()
          if (stationJson.success && stationJson.data) {
            const stations = Array.isArray(stationJson.data) ? stationJson.data : [stationJson.data]
            setStation(stations.find((s: { id: string }) => s.id === stationId) || stations[0] || null)
          }
        }

        if (departuresRes.ok) {
          const depJson = await departuresRes.json()
          if (depJson.success && depJson.data?.schedules) {
            setDepartures(depJson.data.schedules)
          }
        }

        // Fetch featured merchants (Pack Bienvenue)
        try {
          const featuredRes = await fetch(`/api/merchants/featured?stationId=${stationId}`)
          if (featuredRes.ok) {
            const featuredJson = await featuredRes.json()
            if (featuredJson.success) setFeaturedMerchants(featuredJson.data || [])
          }
        } catch {
          // Silent fail for display
        }

        setLastUpdate(new Date())
      } catch {
        // Silent fail for display
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [stationId])

  // Clock
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const brandColor = station?.brandColor || '#10b981'
  const companyName = station?.companyName || 'SmartTicketQR'

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Header */}
      <header className="shrink-0 px-4 md:px-6 py-3" style={{ backgroundColor: brandColor }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bus className="w-6 h-6 text-white/90" />
            <div>
              <h1 className="text-lg font-bold text-white">{station?.name || 'Gare'}</h1>
              <p className="text-xs text-white/70">
                {station?.city}, {station?.country}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isOnline ? 'text-white/90' : 'text-red-200'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
            </div>
            <div className="text-white/90 font-mono text-sm font-bold tabular-nums">{currentTime}</div>
          </div>
        </div>
      </header>

      {/* Departures */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-[1920px] mx-auto w-full">
        {/* Ticker: Offres en vedette */}
        {featuredMerchants.length > 0 && featuredMerchants.some(m => m.offerText) && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg px-4 py-2 mb-4 flex items-center gap-3 overflow-hidden">
            <Gift className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div
                className="flex gap-8 whitespace-nowrap"
                style={{
                  animation: 'scroll 20s linear infinite',
                }}
              >
                {featuredMerchants.filter(m => m.offerText).map((m, i) => (
                  <span key={i} className="text-sm text-amber-300">
                    <span className="font-bold">{m.name}</span>: {m.offerText}
                    {m.offerCode && <span className="ml-2 text-amber-500 font-mono">[{m.offerCode}]</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_70px_70px_80px] gap-2 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/80">
            <span>Ligne / Destination</span>
            <span className="text-center">Quai</span>
            <span className="text-center">Heure</span>
            <span className="text-center">Min</span>
            <span className="text-center">Statut</span>
          </div>

          {/* Table Body */}
          {loading ? (
            <div className="flex items-center justify-center h-48 text-zinc-500">
              <div className="animate-pulse text-sm">Chargement des départs...</div>
            </div>
          ) : departures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <Bus className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Aucun départ prévu</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {departures.map((dep) => {
                const status = statusConfig[dep.status] || statusConfig.SCHEDULED
                const TypeIcon = typeIcons[dep.line.type] || Bus
                return (
                  <motion.div
                    key={dep.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`grid grid-cols-[1fr_100px_70px_70px_80px] gap-2 px-4 py-3 items-center hover:bg-zinc-800/30 transition-colors ${dep.isUrgent ? 'bg-amber-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono shrink-0"
                        style={{
                          backgroundColor: `${dep.line.color}20`,
                          color: dep.line.color,
                          borderLeft: `3px solid ${dep.line.color}`,
                        }}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {dep.line.code}
                      </span>
                      <span className="text-sm font-medium text-zinc-200 truncate">{dep.line.destination}</span>
                    </div>
                    <span className="text-center font-mono text-sm font-bold text-zinc-300">
                      {dep.platform ? dep.platform.number : '—'}
                    </span>
                    <span className="text-center font-mono text-sm tabular-nums text-zinc-300">
                      {dep.delayMinutes > 0 ? (
                        <span>
                          <span className="text-amber-400/60 line-through text-xs">{dep.departureTime}</span>
                          <span className="font-semibold text-zinc-200 ml-1">{dep.adjustedDepartureTime}</span>
                        </span>
                      ) : (
                        dep.departureTime
                      )}
                    </span>
                    <span
                      className={`text-center text-sm font-mono font-bold tabular-nums ${
                        dep.minutesUntil <= 5 && dep.minutesUntil >= 0 ? 'text-emerald-400' :
                        dep.minutesUntil < 0 ? 'text-zinc-500' :
                        'text-zinc-300'
                      }`}
                    >
                      {dep.minutesUntil < 0 ? '—' : dep.minutesUntil === 0 ? 'Now' : `${dep.minutesUntil}`}
                    </span>
                    <div className="flex justify-center">
                      <Badge className={`${status.color} text-xs border-0 px-2 py-0.5`}>
                        {status.label}
                      </Badge>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section: Partenaires / Pack Bienvenue */}
        {featuredMerchants.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4" style={{ color: brandColor }} />
              <h2 className="text-sm font-bold text-zinc-300">Partenaires Officiels</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featuredMerchants.map(merchant => (
                <div key={merchant.id} className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/50 flex flex-col items-center text-center gap-2">
                  {/* Logo or initial */}
                  {merchant.logoUrl ? (
                    <img src={merchant.logoUrl} alt={merchant.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-700 flex items-center justify-center text-lg font-bold" style={{ color: brandColor }}>
                      {merchant.name.charAt(0)}
                    </div>
                  )}
                  <p className="text-xs font-bold text-zinc-200 truncate max-w-full">{merchant.name}</p>
                  <p className="text-[10px] text-zinc-500">{merchant.category}</p>
                  {merchant.offerText && (
                    <p className="text-[10px] text-amber-400 font-semibold">{merchant.offerText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Scroll animation keyframe */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Footer */}
      <footer className="shrink-0 border-t border-zinc-800 px-4 md:px-6 py-2 bg-zinc-900/50">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="font-semibold" style={{ color: brandColor }}>{companyName}</span>
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">{station?.name}</span>
            <span className="tabular-nums">{lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
