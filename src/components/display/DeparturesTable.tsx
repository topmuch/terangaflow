'use client'

import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { StatusBadge, LineBadge, TimeDisplay } from './StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ArrowRight } from 'lucide-react'

interface DepartureItem {
  id: string
  line: {
    id: string
    name: string
    code: string
    destination: string
    color: string
    type: string
    frequencyMinutes: number
    priceRange: string
  }
  platform: {
    id: string
    number: number
    name: string | null
    type: string
  } | null
  departureTime: string
  adjustedDepartureTime: string
  minutesUntil: number
  status: string
  delayMinutes: number
  vehicleNumber: string | null
  isUrgent: boolean
}

interface DeparturesTableProps {
  stationId: string
  autoRefreshMs?: number
  limit?: number
}

export function DeparturesTable({ stationId, autoRefreshMs = 30000, limit = 50 }: DeparturesTableProps) {
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['departures', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/departures?stationId=${stationId}&limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch departures')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Unknown error')
      return json.data
    },
    refetchInterval: autoRefreshMs,
    staleTime: autoRefreshMs - 5000,
  })

  const schedules: DepartureItem[] = data?.schedules || []
  const activeSchedules = schedules.filter(
    (s) => s.status !== 'DEPARTED' && s.status !== 'CANCELLED' && s.minutesUntil >= -15
  )

  // Group by urgency
  const urgentSchedules = activeSchedules.filter((s) => s.isUrgent)
  const normalSchedules = activeSchedules.filter((s) => !s.isUrgent)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Prochains Départs</h2>
          <span className="text-sm text-muted-foreground ml-2 tabular-nums">
            ({activeSchedules.length} en cours)
          </span>
        </div>
        {dataUpdatedAt && (
          <span className="text-xs text-muted-foreground tabular-nums hidden md:block">
            Maj: {new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[120px_1fr_80px_100px_100px] md:grid-cols-[140px_1fr_90px_120px_120px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
        <span>Ligne</span>
        <span>Destination</span>
        <span className="text-center">Quai</span>
        <span className="text-center">Statut</span>
        <span className="text-right">Départ</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2 py-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_80px_100px_100px] md:grid-cols-[140px_1fr_90px_120px_120px] gap-2 px-3 py-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MapPin className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">Impossible de charger les départs</p>
          <p className="text-xs mt-1">Vérifiez votre connexion</p>
        </div>
      )}

      {/* Urgent Departures */}
      <AnimatePresence mode="popLayout">
        {urgentSchedules.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-1"
          >
            {urgentSchedules.map((schedule) => (
              <DepartureRow key={schedule.id} schedule={schedule} isUrgent />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal Departures */}
      <AnimatePresence mode="popLayout">
        <div>
          {normalSchedules.map((schedule) => (
            <DepartureRow key={schedule.id} schedule={schedule} />
          ))}
        </div>
      </AnimatePresence>

      {/* Empty State */}
      {!isLoading && !error && activeSchedules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MapPin className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm font-medium">Aucun départ prévu</p>
          <p className="text-xs mt-1">Les horaires seront mis à jour automatiquement</p>
        </div>
      )}
    </div>
  )
}

// --- Individual Departure Row ---

function DepartureRow({ schedule, isUrgent = false }: { schedule: DepartureItem; isUrgent?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        grid grid-cols-[120px_1fr_80px_100px_100px] md:grid-cols-[140px_1fr_90px_120px_120px] gap-2 px-3 py-2.5 items-center
        transition-colors duration-200 border-b border-border/20
        ${isUrgent
          ? 'bg-emerald-500/10 border-l-2 border-emerald-400'
          : 'hover:bg-muted/50'
        }
      `}
    >
      {/* Line Badge */}
      <LineBadge code={schedule.line.code} color={schedule.line.color} type={schedule.line.type} />

      {/* Destination */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-semibold text-sm md:text-base truncate">
          {schedule.line.destination}
        </span>
        {schedule.vehicleNumber && (
          <span className="text-xs text-muted-foreground font-mono">
            {schedule.vehicleNumber}
          </span>
        )}
      </div>

      {/* Platform */}
      <div className="flex flex-col items-center">
        <span className={`
          text-xl md:text-2xl font-bold font-mono tabular-nums
          ${schedule.platform?.type === 'VIP' ? 'text-amber-400' : 'text-foreground'}
        `}>
          {schedule.platform?.number ?? '—'}
        </span>
        {schedule.platform?.type === 'VIP' && (
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">VIP</span>
        )}
      </div>

      {/* Status */}
      <div className="flex justify-center">
        <StatusBadge
          status={schedule.status as 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'DELAYED' | 'CANCELLED'}
          delayMinutes={schedule.delayMinutes}
        />
      </div>

      {/* Time */}
      <TimeDisplay
        time={schedule.departureTime}
        adjustedTime={schedule.adjustedDepartureTime}
        delayMinutes={schedule.delayMinutes}
        isUrgent={schedule.isUrgent}
        minutesUntil={schedule.minutesUntil}
      />
    </motion.div>
  )
}
