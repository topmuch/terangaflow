'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Bus,
  Train,
  Ship,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DoorOpen,
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
  Timer,
  RotateCcw,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card } from '@/components/ui/card'
import { CsvUploader } from '@/components/dashboard/CsvUploader'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TripTableProps {
  stationId: string
}

type ScheduleStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'DELAYED' | 'CANCELLED'

interface LineData {
  id: string
  name: string
  code: string
  destination: string
  color: string
  type: string
}

interface PlatformData {
  id: string
  number: number
  name: string | null
  type: string | null
}

interface ScheduleData {
  id: string
  lineId: string
  stationId: string
  platformId: string | null
  departureTime: string
  arrivalTime: string | null
  daysOfWeek: string
  status: ScheduleStatus
  delayMinutes: number
  vehicleNumber: string | null
  notes: string | null
  line: LineData
  platform: PlatformData | null
  minutesUntil: number
  isUrgent: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CYCLE: ScheduleStatus[] = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'DELAYED']

const STATUS_CONFIG: Record<
  ScheduleStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  SCHEDULED: { label: 'Prévu', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30', icon: Clock },
  BOARDING: { label: 'Embarquement', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: DoorOpen },
  DEPARTED: { label: 'Parti', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30', icon: CheckCircle2 },
  DELAYED: { label: 'Retardé', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertTriangle },
  CANCELLED: { label: 'Annulé', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
}

const LINE_TYPE_ICONS: Record<string, typeof Bus> = {
  BUS: Bus,
  TRAIN: Train,
  FERRY: Ship,
  TAXI: Clock,
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TripTable({ stationId }: TripTableProps) {
  const queryClient = useQueryClient()

  // Filter state
  const [selectedLineId, setSelectedLineId] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showCsvUploader, setShowCsvUploader] = useState(false)

  // ─── Data fetching ──────────────────────────────────────────────────────

  const {
    data: linesData,
    isLoading: linesLoading,
  } = useQuery({
    queryKey: ['lines', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/lines?stationId=${stationId}`)
      if (!res.ok) throw new Error('Erreur lors du chargement des lignes')
      const json = await res.json()
      return json.data as LineData[]
    },
  })

  const {
    data: schedulesData,
    isLoading: schedulesLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['schedules', stationId, selectedLineId, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ stationId })
      if (selectedLineId !== 'all') params.set('lineId', selectedLineId)
      if (selectedStatus !== 'all') params.set('status', selectedStatus)

      const res = await fetch(`/api/schedules?${params.toString()}`)
      if (!res.ok) throw new Error('Erreur lors du chargement des horaires')
      const json = await res.json()
      return json.data as ScheduleData[]
    },
    refetchInterval: 15000,
  })

  // ─── Derived data ───────────────────────────────────────────────────────

  const lines = linesData ?? []
  const schedules = schedulesData ?? []

  const filteredSchedules = schedules.filter((s) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      s.line.destination.toLowerCase().includes(query) ||
      s.line.code.toLowerCase().includes(query) ||
      s.line.name.toLowerCase().includes(query)
    )
  })

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCycleStatus = useCallback(
    async (schedule: ScheduleData) => {
      // CANCELLED stays cancelled; others cycle through STATUS_CYCLE
      if (schedule.status === 'CANCELLED') return

      const currentIndex = STATUS_CYCLE.indexOf(schedule.status)
      const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length]

      try {
        const res = await fetch('/api/schedules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: schedule.id, status: nextStatus }),
        })
        if (!res.ok) throw new Error()

        toast.success(
          `Statut mis à jour → ${STATUS_CONFIG[nextStatus].label}`,
          { description: `${schedule.line.code} vers ${schedule.line.destination}` }
        )
        queryClient.invalidateQueries({ queryKey: ['schedules'] })
      } catch {
        toast.error('Erreur', { description: 'Impossible de modifier le statut' })
      }
    },
    [queryClient]
  )

  const handleBulkAction = useCallback(
    async (action: 'DELAY_ALL' | 'CANCEL_ALL' | 'RESET_ALL') => {
      const body: Record<string, unknown> = { stationId, action }
      if (selectedLineId !== 'all') body.lineId = selectedLineId

      const actionLabels = {
        DELAY_ALL: { success: 'Retard signalé (+15 min)', error: 'Erreur lors du signal de retard' },
        CANCEL_ALL: { success: 'Tous les départs annulés', error: "Erreur lors de l'annulation" },
        RESET_ALL: { success: 'Tous les départs réinitialisés', error: 'Erreur lors de la réinitialisation' },
      }

      try {
        const res = await fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()

        toast.success(actionLabels[action].success)
        queryClient.invalidateQueries({ queryKey: ['schedules'] })
      } catch {
        toast.error(actionLabels[action].error)
      }
    },
    [stationId, selectedLineId, queryClient]
  )

  // ─── Helpers ────────────────────────────────────────────────────────────

  const getLineTypeIcon = (type: string) => LINE_TYPE_ICONS[type] || Bus
  const getDelayDisplay = (delayMinutes: number) => {
    if (delayMinutes <= 0) return null
    return `+${delayMinutes} min`
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Line filter */}
          <div className="flex flex-col gap-1.5 min-w-[180px] w-full sm:w-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ligne
            </span>
            {linesLoading ? (
              <Skeleton className="h-9 w-full rounded-md bg-slate-800" />
            ) : (
              <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Toutes les lignes" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Toutes les lignes</SelectItem>
                  {lines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: line.color }}
                        />
                        {line.code} — {line.destination}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Status filter */}
          <div className="flex flex-col gap-1.5 min-w-[180px] w-full sm:w-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Statut
            </span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="SCHEDULED">Prévu</SelectItem>
                <SelectItem value="BOARDING">Embarquement</SelectItem>
                <SelectItem value="DEPARTED">Parti</SelectItem>
                <SelectItem value="DELAYED">Retardé</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search input */}
          <div className="flex flex-col gap-1.5 flex-1 w-full sm:max-w-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rechercher
            </span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Destination ou code..."
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Refresh button */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-transparent">
              &nbsp;
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk actions row */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          <span className="text-sm text-slate-400 font-medium">
            Actions groupées
            {selectedLineId !== 'all' && (
              <Badge variant="outline" className="ml-2 text-xs border-slate-600 text-slate-300">
                Ligne filtrée
              </Badge>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            {/* Delay all */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  <Timer className="w-3.5 h-3.5" />
                  Signaler Retard (+15 min)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    Confirmer le signal de retard
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Cela va marquer tous les départs actifs
                    {selectedLineId !== 'all' ? ' de la ligne sélectionnée' : ''} comme
                    « Retardé » avec un retard de +15 minutes. Cette action est
                    irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkAction('DELAY_ALL')}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Cancel all */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Annuler tout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    Confirmer l'annulation totale
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Cela va annuler tous les départs actifs
                    {selectedLineId !== 'all' ? ' de la ligne sélectionnée' : ''}.
                    Les voyageurs verront ces départs comme annulés. Cette action
                    affecte les statuts « Prévu », « Embarquement » et « Retardé ».
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkAction('CANCEL_ALL')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirmer l'annulation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Reset all */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réinitialiser
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border-slate-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    Confirmer la réinitialisation
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Cela va réinitialiser tous les départs
                    {selectedLineId !== 'all' ? ' de la ligne sélectionnée' : ''} au
                    statut « Prévu » avec 0 minute de retard. Les annulations et
                    départs enregistrés seront également remis à zéro.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleBulkAction('RESET_ALL')}
                    className="bg-slate-600 hover:bg-slate-500 text-white"
                  >
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* CSV Import toggle */}
            <Button
              size="sm"
              variant="outline"
              className={`border-slate-700 hover:bg-slate-800 hover:text-white gap-1.5 ${showCsvUploader ? 'bg-slate-700 text-white' : 'text-slate-300'}`}
              onClick={() => setShowCsvUploader((prev) => !prev)}
            >
              {showCsvUploader ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              {showCsvUploader ? 'Fermer' : 'Import CSV'}
            </Button>
          </div>
        </div>
      </Card>

      {/* CSV Uploader panel */}
      <AnimatePresence>
        {showCsvUploader && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CsvUploader stationId={stationId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {schedulesLoading ? (
          <div className="p-4 space-y-3">
            {/* Skeleton header */}
            <div className="flex gap-4 px-2">
              <Skeleton className="h-4 w-16 bg-slate-800" />
              <Skeleton className="h-4 w-32 bg-slate-800" />
              <Skeleton className="h-4 w-16 bg-slate-800" />
              <Skeleton className="h-4 w-16 bg-slate-800" />
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-4 w-16 bg-slate-800" />
              <Skeleton className="h-4 w-20 bg-slate-800" />
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 px-2 items-center">
                <Skeleton className="h-8 w-16 bg-slate-800 rounded" />
                <Skeleton className="h-4 w-32 bg-slate-800" />
                <Skeleton className="h-4 w-16 bg-slate-800" />
                <Skeleton className="h-4 w-16 bg-slate-800" />
                <Skeleton className="h-6 w-24 bg-slate-800 rounded-full" />
                <Skeleton className="h-6 w-16 bg-slate-800 rounded-full" />
                <Skeleton className="h-8 w-8 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Aucun départ trouvé
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              {schedules.length === 0
                ? "Il n'y a aucun horaire enregistré pour cette station avec les filtres actuels."
                : "Aucun résultat ne correspond à votre recherche. Essayez de modifier vos filtres."}
            </p>
            {(searchQuery || selectedLineId !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedLineId('all')
                  setSelectedStatus('all')
                }}
                className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  Ligne
                </TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  Destination
                </TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  Heure
                </TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  Quai
                </TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  Statut
                </TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  Retard
                </TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredSchedules.map((schedule) => {
                  const statusCfg = STATUS_CONFIG[schedule.status]
                  const StatusIcon = statusCfg.icon
                  const LineIcon = getLineTypeIcon(schedule.line.type)
                  const delayDisplay = getDelayDisplay(schedule.delayMinutes)

                  return (
                    <motion.tr
                      key={schedule.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Line badge */}
                      <TableCell className="py-3 px-3">
                        <div
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-bold text-white"
                          style={{
                            backgroundColor: `${schedule.line.color}20`,
                            borderLeft: `3px solid ${schedule.line.color}`,
                          }}
                        >
                          <LineIcon className="w-3.5 h-3.5" style={{ color: schedule.line.color }} />
                          {schedule.line.code}
                        </div>
                      </TableCell>

                      {/* Destination */}
                      <TableCell className="py-3 px-3">
                        <span className="text-sm text-white font-medium">
                          {schedule.line.destination}
                        </span>
                      </TableCell>

                      {/* Departure time */}
                      <TableCell className="py-3 px-3">
                        <span className="text-sm text-white font-mono tabular-nums">
                          {schedule.departureTime}
                        </span>
                      </TableCell>

                      {/* Platform */}
                      <TableCell className="py-3 px-3">
                        {schedule.platform ? (
                          <span className="text-sm text-slate-300">
                            {schedule.platform.name || `Quai ${schedule.platform.number}`}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-600">—</span>
                        )}
                      </TableCell>

                      {/* Status badge */}
                      <TableCell className="py-3 px-3">
                        <button
                          onClick={() => handleCycleStatus(schedule)}
                          disabled={schedule.status === 'CANCELLED'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            statusCfg.color
                          } ${
                            schedule.status !== 'CANCELLED'
                              ? 'cursor-pointer hover:scale-105 active:scale-95'
                              : 'cursor-default opacity-70'
                          }`}
                          title={
                            schedule.status !== 'CANCELLED'
                              ? 'Cliquer pour changer le statut'
                              : 'Statut verrouillé'
                          }
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </button>
                      </TableCell>

                      {/* Delay */}
                      <TableCell className="py-3 px-3">
                        {delayDisplay ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs font-semibold"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {delayDisplay}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {schedule.isUrgent && (
                            <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] font-bold px-1.5">
                              URGENT
                            </Badge>
                          )}
                          {schedule.vehicleNumber && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {schedule.vehicleNumber}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}

        {/* Footer with count */}
        {!schedulesLoading && filteredSchedules.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {filteredSchedules.length} départ{filteredSchedules.length > 1 ? 's' : ''} affiché{filteredSchedules.length > 1 ? 's' : ''}
              {schedules.length !== filteredSchedules.length && ` sur ${schedules.length}`}
            </span>
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              Actualisation auto toutes les 15 s
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}
