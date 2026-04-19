'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Lucide icons
import {
  Bus, Train, Ship, Clock, CheckCircle2, XCircle,
  AlertTriangle, Timer, Route, Truck,
  RotateCcw, AlarmClock, CalendarDays, History,
  ChevronRight, PlayCircle, PlusCircle,
  TrendingUp, ArrowUpRight,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface TransporterDashboardProps {
  transporterId: string
  transporterName: string
  stations: Array<{ id: string; name: string; code: string }>
}

interface Line {
  id: string
  name: string
  code: string
  destination: string
  stationId: string
  transporterId: string | null
  color: string
  type: string
  frequencyMinutes: number
  priceRange: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  station: { id: string; name: string; code: string }
  _count: { schedules: number; platforms: number }
}

interface Schedule {
  id: string
  lineId: string
  stationId: string
  platformId: string | null
  departureTime: string
  arrivalTime: string | null
  daysOfWeek: string
  status: string
  delayMinutes: number
  vehicleNumber: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  line: {
    id: string; name: string; code: string; destination: string;
    color: string; type: string
  }
  platform: { id: string; number: number; name: string; type: string } | null
}

// ============================================================
// Helpers
// ============================================================

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  SCHEDULED: { label: 'Prévu', icon: Clock, className: 'bg-sky-500/15 text-sky-400' },
  BOARDING: { label: 'Embarquement', icon: PlayCircle, className: 'bg-emerald-500/20 text-emerald-400' },
  DEPARTED: { label: 'Parti', icon: CheckCircle2, className: 'bg-zinc-500/15 text-zinc-500' },
  DELAYED: { label: 'Retardé', icon: AlertTriangle, className: 'bg-amber-500/20 text-amber-400' },
  CANCELLED: { label: 'Annulé', icon: XCircle, className: 'bg-red-500/20 text-red-400' },
}

const lineTypeIcons: Record<string, React.ElementType> = { BUS: Bus, TRAIN: Train, FERRY: Ship, TAXI: Clock }

const lineTypeLabels: Record<string, string> = { BUS: 'Bus', TRAIN: 'Train', FERRY: 'Ferry', TAXI: 'Taxi' }

const lineTypeBadgeClass: Record<string, string> = {
  BUS: 'bg-emerald-500/15 text-emerald-400',
  TRAIN: 'bg-sky-500/15 text-sky-400',
  FERRY: 'bg-cyan-500/15 text-cyan-400',
  TAXI: 'bg-purple-500/15 text-purple-400',
}

// ============================================================
// Tab transition variant
// ============================================================

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ============================================================
// Main Component
// ============================================================

export function TransporterDashboard({ transporterId, transporterName, stations }: TransporterDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

  // When a line is clicked in "My Lines" tab, switch to schedule tab
  const handleLineClick = (lineId: string) => {
    setSelectedLineId(lineId)
    setActiveTab('schedules')
  }

  return (
    <div className="w-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Truck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{transporterName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Route className="w-3 h-3" />
              Tableau de bord transporteur
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-mono gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Connecté
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        <ScrollArea className="w-full -mb-px">
          <TabsList className="w-full sm:w-auto flex sm:inline-flex h-auto sm:h-9 p-1 gap-1 bg-muted/50">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Vue d&apos;ensemble</span>
              <span className="xs:hidden">Vue</span>
            </TabsTrigger>
            <TabsTrigger value="lines" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Route className="w-3.5 h-3.5" />
              Mes lignes
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Timer className="w-3.5 h-3.5" />
              Horaires
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <History className="w-3.5 h-3.5" />
              Historique
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <Separator className="mt-0" />

        {/* Tab Content with AnimatePresence */}
        <div className="flex-1 min-h-0 mt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <OverviewTab transporterId={transporterId} />
              </motion.div>
            )}
            {activeTab === 'lines' && (
              <motion.div key="lines" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <MyLinesTab transporterId={transporterId} onLineClick={handleLineClick} />
              </motion.div>
            )}
            {activeTab === 'schedules' && (
              <motion.div key="schedules" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <ScheduleManagementTab
                  transporterId={transporterId}
                  stations={stations}
                  selectedLineId={selectedLineId}
                  onLineSelect={setSelectedLineId}
                />
              </motion.div>
            )}
            {activeTab === 'history' && (
              <motion.div key="history" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <DelayHistoryTab transporterId={transporterId} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  )
}

// ============================================================
// Overview Tab
// ============================================================

function OverviewTab({ transporterId }: { transporterId: string }) {
  const queryClient = useQueryClient()

  // Fetch all lines for this transporter
  const { data: lines, isLoading: linesLoading } = useQuery<Line[]>({
    queryKey: ['transporter-lines', transporterId],
    queryFn: async () => {
      const res = await fetch(`/api/lines?transporterId=${transporterId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  // Fetch all schedules for all lines of this transporter
  const lineIds = lines?.map((l) => l.id) ?? []
  const { data: allSchedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ['transporter-all-schedules', transporterId, lineIds],
    queryFn: async () => {
      if (lineIds.length === 0) return []
      const schedules: Schedule[] = []
      await Promise.all(
        lineIds.map(async (lineId) => {
          const line = lines?.find((l) => l.id === lineId)
          if (!line) return
          const res = await fetch(`/api/schedules?stationId=${line.stationId}&lineId=${lineId}`)
          if (!res.ok) return
          const json = await res.json()
          if (json.success && json.data) {
            schedules.push(...(json.data as Schedule[]))
          }
        })
      )
      return schedules
    },
    enabled: lineIds.length > 0,
    refetchInterval: 15000,
  })

  // Compute stats
  const stats = useMemo(() => {
    const totalLines = lines?.length ?? 0
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()

    const todaySchedules = allSchedules?.filter((s) => {
      if (!s.daysOfWeek) return false
      return s.daysOfWeek.split(',').map((d: string) => d.trim()).includes(dayName)
    }) ?? []

    const activeToday = todaySchedules.filter((s) => s.status !== 'CANCELLED').length
    const delayedNow = todaySchedules.filter((s) => s.delayMinutes > 0 || s.status === 'DELAYED').length
    const totalTrips = todaySchedules.length

    return { totalLines, activeToday, delayedNow, totalTrips }
  }, [lines, allSchedules])

  // Bulk delay mutation
  const bulkDelayMutation = useMutation({
    mutationFn: async () => {
      const stationId = lines?.[0]?.stationId
      const lineId = lineIds[0]
      if (!stationId || !lineId) throw new Error('Aucune ligne disponible')

      // Apply delay to ALL lines sequentially
      await Promise.all(
        lineIds.map(async (lid) => {
          const line = lines?.find((l) => l.id === lid)
          if (!line) return
          const res = await fetch('/api/schedules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stationId: line.stationId,
              lineId: lid,
              action: 'DELAY_ALL',
              params: { delayMinutes: 15 },
            }),
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error)
        })
      )
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-lines'] })
      queryClient.invalidateQueries({ queryKey: ['transporter-all-schedules'] })
      toast.success('Retard global de +15 min appliqué à toutes les lignes')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Bulk reset mutation
  const bulkResetMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        lineIds.map(async (lid) => {
          const line = lines?.find((l) => l.id === lid)
          if (!line) return
          const res = await fetch('/api/schedules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stationId: line.stationId,
              lineId: lid,
              action: 'RESET_ALL',
              params: {},
            }),
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error)
        })
      )
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-lines'] })
      queryClient.invalidateQueries({ queryKey: ['transporter-all-schedules'] })
      toast.success('Tous les horaires ont été réinitialisés')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const isLoading = linesLoading || schedulesLoading

  const statCards = [
    {
      title: 'Lignes totales',
      value: stats.totalLines,
      icon: Route,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      sub: `${stats.activeToday} actifs aujourd'hui`,
    },
    {
      title: 'Horaires actifs (auj.)',
      value: stats.activeToday,
      icon: CalendarDays,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      sub: `${stats.totalTrips} trajets programmés`,
    },
    {
      title: 'En retard maintenant',
      value: stats.delayedNow,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      sub: stats.delayedNow > 0 ? 'Intervention requise' : 'Aucun retard',
    },
    {
      title: 'Trajets aujourd\'hui',
      value: stats.totalTrips,
      icon: ArrowUpRight,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      sub: `${stats.activeToday} non annulés`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : statCards.map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn('border', card.borderColor, 'overflow-hidden')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                        <p className={cn('text-3xl font-bold tabular-nums', card.color)}>{card.value}</p>
                        <p className="text-xs text-muted-foreground">{card.sub}</p>
                      </div>
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bgColor)}>
                        <card.icon className={cn('w-5 h-5', card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="w-4 h-4 text-emerald-500" />
            Actions rapides
          </CardTitle>
          <CardDescription>Gérer les horaires de toutes vos lignes en une seule action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={bulkDelayMutation.isPending || lineIds.length === 0}
                >
                  <AlarmClock className="w-4 h-4" />
                  Signaler retard global (+15 min)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer le retard global ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cela ajoutera 15 minutes de retard à <strong>tous</strong> les horaires actifs de vos{' '}
                    {stats.totalLines} ligne(s). Les passagers seront notifiés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => bulkDelayMutation.mutate()}
                  >
                    {bulkDelayMutation.isPending ? 'Application...' : 'Appliquer +15 min'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-400"
                  disabled={bulkResetMutation.isPending || lineIds.length === 0}
                >
                  <RotateCcw className="w-4 h-4" />
                  Réinitialiser les horaires
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Réinitialiser tous les horaires ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tous les retards et annulations de vos {stats.totalLines} ligne(s) seront supprimés.
                    Les horaires reprendront leur état initial.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => bulkResetMutation.mutate()}
                  >
                    {bulkResetMutation.isPending ? 'Réinitialisation...' : 'Réinitialiser'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// My Lines Tab
// ============================================================

function MyLinesTab({
  transporterId,
  onLineClick,
}: {
  transporterId: string
  onLineClick: (lineId: string) => void
}) {
  const { data: lines, isLoading } = useQuery<Line[]>({
    queryKey: ['transporter-lines', transporterId],
    queryFn: async () => {
      const res = await fetch(`/api/lines?transporterId=${transporterId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold">Mes lignes</h3>
          <p className="text-xs text-muted-foreground">{lines?.length ?? 0} ligne(s) assignée(s)</p>
        </div>
      </div>

      {/* Lines Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !lines?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Route className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune ligne assignée</p>
              <p className="text-xs mt-1">Contactez l&apos;administrateur de la gare</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Code</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Couleur</TableHead>
                  <TableHead className="hidden lg:table-cell">Fréquence</TableHead>
                  <TableHead className="hidden sm:table-cell">Gare</TableHead>
                  <TableHead className="pr-4 text-right">Horaires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const TypeIcon = lineTypeIcons[line.type] || Bus
                  return (
                    <TableRow
                      key={line.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onLineClick(line.id)}
                    >
                      <TableCell className="pl-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold font-mono"
                          style={{
                            backgroundColor: `${line.color}20`,
                            color: line.color,
                            borderLeft: `3px solid ${line.color}`,
                          }}
                        >
                          <TypeIcon className="w-3.5 h-3.5" />
                          {line.code}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{line.destination}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={cn('text-xs gap-1', lineTypeBadgeClass[line.type] || 'bg-zinc-500/15 text-zinc-400')}>
                          <TypeIcon className="w-3 h-3" />
                          {lineTypeLabels[line.type] || line.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full border border-border/50" style={{ backgroundColor: line.color }} />
                          <span className="text-xs font-mono text-muted-foreground">{line.color}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-mono tabular-nums">{line.frequencyMinutes} min</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{line.station.name}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge variant="secondary" className="text-xs tabular-nums">
                            {line._count.schedules}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Schedule Management Tab
// ============================================================

function ScheduleManagementTab({
  transporterId,
  stations,
  selectedLineId,
  onLineSelect,
}: {
  transporterId: string
  stations: Array<{ id: string; name: string; code: string }>
  selectedLineId: string | null
  onLineSelect: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const [delayingId, setDelayingId] = useState<string | null>(null)

  // Fetch lines for the select dropdown
  const { data: lines, isLoading: linesLoading } = useQuery<Line[]>({
    queryKey: ['transporter-lines', transporterId],
    queryFn: async () => {
      const res = await fetch(`/api/lines?transporterId=${transporterId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  // The currently selected line
  const selectedLine = lines?.find((l) => l.id === selectedLineId) ?? null

  // Fetch schedules for the selected line
  const { data: schedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ['transporter-schedules', transporterId, selectedLineId],
    queryFn: async () => {
      if (!selectedLine) return []
      const res = await fetch(`/api/schedules?stationId=${selectedLine.stationId}&lineId=${selectedLineId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    enabled: !!selectedLineId && !!selectedLine,
    refetchInterval: 10000,
  })

  // PATCH mutation for single schedule updates
  const patchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Schedule> }) => {
      const res = await fetch('/api/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['transporter-all-schedules'] })
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // PUT mutation for bulk line actions
  const bulkMutation = useMutation({
    mutationFn: async ({ action, params }: { action: string; params: Record<string, unknown> }) => {
      if (!selectedLine) throw new Error('Aucune ligne sélectionnée')
      const res = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedLine.stationId,
          lineId: selectedLineId,
          action,
          params,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-schedules'] })
      queryClient.invalidateQueries({ queryKey: ['transporter-all-schedules'] })
      toast.success('Action appliquée avec succès')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const handleDelay = (scheduleId: string, minutes: number) => {
    const schedule = schedules?.find((s) => s.id === scheduleId)
    if (!schedule) return
    const newDelay = (schedule.delayMinutes || 0) + minutes
    patchMutation.mutate(
      { id: scheduleId, data: { delayMinutes: newDelay, status: newDelay > 0 ? 'DELAYED' : 'SCHEDULED' } },
      {
        onSuccess: () => {
          toast.success(`Retard de +${minutes} min appliqué (total: ${newDelay} min)`)
          setDelayingId(null)
        },
      }
    )
  }

  const handleCancel = (scheduleId: string) => {
    patchMutation.mutate(
      { id: scheduleId, data: { status: 'CANCELLED' } },
      {
        onSuccess: () => toast.success('Horaire annulé'),
      }
    )
  }

  const handleRestore = (scheduleId: string) => {
    patchMutation.mutate(
      { id: scheduleId, data: { status: 'SCHEDULED', delayMinutes: 0 } },
      {
        onSuccess: () => toast.success('Horaire rétabli'),
      }
    )
  }

  const handleBulkDelay = () => {
    bulkMutation.mutate({ action: 'DELAY_ALL', params: { delayMinutes: 15 } })
  }

  const handleBulkCancel = () => {
    bulkMutation.mutate({ action: 'CANCEL_ALL', params: {} })
  }

  const handleBulkReset = () => {
    bulkMutation.mutate({ action: 'RESET_ALL', params: {} })
  }

  const delayOptions = [5, 10, 15, 30, 60]

  return (
    <div className="space-y-4">
      {/* Header with Line Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Sélectionner une ligne</Label>
          <Select
            value={selectedLineId ?? ''}
            onValueChange={(v) => onLineSelect(v)}
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Choisir une ligne..." />
            </SelectTrigger>
            <SelectContent>
              {linesLoading && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">Chargement...</div>
              )}
              {lines?.map((line) => {
                const TypeIcon = lineTypeIcons[line.type] || Bus
                return (
                  <SelectItem key={line.id} value={line.id}>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-3.5 h-3.5" style={{ color: line.color }} />
                      <span className="font-mono font-bold">{line.code}</span>
                      <span className="text-muted-foreground">—</span>
                      <span>{line.destination}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedLine && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleBulkDelay}
              disabled={bulkMutation.isPending}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Retard global +15 min
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-600/40 text-red-400 hover:bg-red-600/10 hover:text-red-400"
              onClick={handleBulkCancel}
              disabled={bulkMutation.isPending}
            >
              <XCircle className="w-3.5 h-3.5" />
              Tout annuler
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-400"
              onClick={handleBulkReset}
              disabled={bulkMutation.isPending}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tout rétablir
            </Button>
          </div>
        )}
      </div>

      {/* Schedules Table */}
      <Card>
        <CardHeader className="pb-3">
          {selectedLine && (
            <>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono"
                    style={{
                      backgroundColor: `${selectedLine.color}20`,
                      color: selectedLine.color,
                      borderLeft: `3px solid ${selectedLine.color}`,
                    }}
                  >
                    {selectedLine.code}
                  </span>
                  Horaires — {selectedLine.destination}
                </CardTitle>
                <Badge variant="outline" className="text-xs gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </Badge>
              </div>
              <CardDescription>
                {schedules?.length ?? 0} horaire(s) — Gare: {selectedLine.station.name}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!selectedLineId ? (
            <div className="text-center py-12 text-muted-foreground">
              <Timer className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sélectionnez une ligne pour voir ses horaires</p>
            </div>
          ) : schedulesLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !schedules?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun horaire pour cette ligne</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Départ</TableHead>
                    <TableHead className="hidden sm:table-cell">Quai</TableHead>
                    <TableHead>Jours</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden md:table-cell">Retard</TableHead>
                    <TableHead className="hidden lg:table-cell">Véhicule</TableHead>
                    <TableHead className="pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => {
                    const st = statusConfig[schedule.status] || statusConfig.SCHEDULED
                    const StIcon = st.icon
                    return (
                      <TableRow key={schedule.id}>
                        <TableCell className="pl-4">
                          <span className="text-sm font-mono tabular-nums font-semibold">
                            {schedule.departureTime}
                          </span>
                          {schedule.delayMinutes > 0 && (
                            <span className="ml-2 text-xs text-amber-400 font-mono">
                              +{schedule.delayMinutes} min
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm font-mono">
                          {schedule.platform ? schedule.platform.number : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[120px]">
                            {schedule.daysOfWeek.split(',').map((day: string) => {
                              const trimmed = day.trim()
                              const dayLabels: Record<string, string> = {
                                MON: 'L', TUE: 'M', WED: 'M', THU: 'J', FRI: 'V', SAT: 'S', SUN: 'D',
                              }
                              return (
                                <span
                                  key={trimmed}
                                  className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-muted text-muted-foreground"
                                >
                                  {dayLabels[trimmed] || trimmed}
                                </span>
                              )
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold', st.className)}>
                            <StIcon className="w-3 h-3" />
                            {st.label}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={cn(
                            'text-sm font-mono tabular-nums font-semibold',
                            schedule.delayMinutes > 0 ? 'text-amber-400' : 'text-muted-foreground',
                          )}>
                            {schedule.delayMinutes > 0 ? `${schedule.delayMinutes} min` : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-mono">
                          {schedule.vehicleNumber || '—'}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Delay button / inline form */}
                            {schedule.status !== 'CANCELLED' && schedule.status !== 'DEPARTED' && (
                              <>
                                {delayingId === schedule.id ? (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-1"
                                  >
                                    {delayOptions.map((min) => (
                                      <Button
                                        key={min}
                                        size="sm"
                                        variant="outline"
                                        className={cn(
                                          'h-7 px-2 text-xs font-mono',
                                          min <= 10
                                            ? 'border-amber-600/40 text-amber-400 hover:bg-amber-600/10'
                                            : 'border-red-600/40 text-red-400 hover:bg-red-600/10'
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDelay(schedule.id, min)
                                        }}
                                        disabled={patchMutation.isPending}
                                      >
                                        +{min}
                                      </Button>
                                    ))}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-muted-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDelayingId(null)
                                      }}
                                    >
                                      ✕
                                    </Button>
                                  </motion.div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs gap-1 border-amber-600/40 text-amber-400 hover:bg-amber-600/10 hover:text-amber-400"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDelayingId(schedule.id)
                                    }}
                                  >
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="hidden sm:inline">Retard</span>
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Cancel button */}
                            {schedule.status !== 'CANCELLED' && schedule.status !== 'DEPARTED' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs gap-1 border-red-600/40 text-red-400 hover:bg-red-600/10 hover:text-red-400"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span className="hidden sm:inline">Annuler</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Annuler cet horaire ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      L&apos;horaire de <strong>{schedule.departureTime}</strong> sera annulé.
                                      Les passagers seront notifiés.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Non, garder</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                      onClick={() => handleCancel(schedule.id)}
                                    >
                                      Annuler l&apos;horaire
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Restore button */}
                            {(schedule.status === 'CANCELLED' || schedule.status === 'DELAYED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs gap-1 border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-400"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRestore(schedule.id)
                                }}
                                disabled={patchMutation.isPending}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span className="hidden sm:inline">Rétablir</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Delay History Tab
// ============================================================

function DelayHistoryTab({ transporterId }: { transporterId: string }) {
  // Fetch all lines
  const { data: lines, isLoading: linesLoading } = useQuery<Line[]>({
    queryKey: ['transporter-lines', transporterId],
    queryFn: async () => {
      const res = await fetch(`/api/lines?transporterId=${transporterId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })

  // Fetch all schedules for all lines
  const lineIds = lines?.map((l) => l.id) ?? []
  const { data: allSchedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ['transporter-delay-history', transporterId, lineIds],
    queryFn: async () => {
      if (lineIds.length === 0) return []
      const schedules: Schedule[] = []
      await Promise.all(
        lineIds.map(async (lineId) => {
          const line = lines?.find((l) => l.id === lineId)
          if (!line) return
          const res = await fetch(`/api/schedules?stationId=${line.stationId}&lineId=${lineId}`)
          if (!res.ok) return
          const json = await res.json()
          if (json.success && json.data) {
            schedules.push(...(json.data as Schedule[]))
          }
        })
      )
      return schedules
    },
    enabled: lineIds.length > 0,
    refetchInterval: 30000,
  })

  // Filter and group delayed schedules by date
  const groupedHistory = useMemo(() => {
    const delayed = allSchedules?.filter(
      (s) => s.delayMinutes > 0 || s.status === 'DELAYED' || s.status === 'CANCELLED'
    ) ?? []

    // Group by updatedAt date
    const groups: Record<string, { date: string; label: string; items: Schedule[] }> = {}
    for (const schedule of delayed) {
      const dateKey = schedule.updatedAt?.split('T')[0] ?? 'unknown'
      const dateObj = new Date(dateKey)
      const label = dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, label, items: [] }
      }
      groups[dateKey].items.push(schedule)
    }

    // Sort by date descending
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [allSchedules])

  const totalDelayed = useMemo(
    () => (allSchedules?.filter((s) => s.delayMinutes > 0 || s.status === 'DELAYED' || s.status === 'CANCELLED').length ?? 0),
    [allSchedules]
  )

  const isLoading = linesLoading || schedulesLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold">Historique des retards</h3>
          <p className="text-xs text-muted-foreground">
            {totalDelayed} horaire(s) avec retard ou annulation
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 border-amber-600/40 text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          {totalDelayed} enregistrement(s)
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groupedHistory.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-40" />
            <p className="text-sm">Aucun retard ou annulation enregistré</p>
            <p className="text-xs mt-1">Les retards apparaîtront ici automatiquement</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedHistory.map((group) => (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold capitalize">
                      {group.label}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {group.items.length} événement(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Ligne</TableHead>
                          <TableHead className="hidden sm:table-cell">Départ</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="hidden md:table-cell">Retard</TableHead>
                          <TableHead className="pr-4 text-right hidden sm:table-cell">Mis à jour</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((schedule) => {
                          const st = statusConfig[schedule.status] || statusConfig.SCHEDULED
                          const StIcon = st.icon
                          const TypeIcon = lineTypeIcons[schedule.line.type] || Bus
                          return (
                            <TableRow key={schedule.id}>
                              <TableCell className="pl-4">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono"
                                  style={{
                                    backgroundColor: `${schedule.line.color}20`,
                                    color: schedule.line.color,
                                    borderLeft: `3px solid ${schedule.line.color}`,
                                  }}
                                >
                                  <TypeIcon className="w-3 h-3" />
                                  {schedule.line.code}
                                </span>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm font-mono tabular-nums">
                                {schedule.departureTime}
                              </TableCell>
                              <TableCell>
                                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold', st.className)}>
                                  <StIcon className="w-3 h-3" />
                                  {st.label}
                                </span>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className={cn(
                                  'text-sm font-mono tabular-nums font-semibold',
                                  schedule.delayMinutes > 0 ? 'text-amber-400' : 'text-muted-foreground',
                                )}>
                                  {schedule.delayMinutes > 0 ? `+${schedule.delayMinutes} min` : '—'}
                                </span>
                              </TableCell>
                              <TableCell className="pr-4 text-right hidden sm:table-cell">
                                <span className="text-xs text-muted-foreground">
                                  {schedule.updatedAt
                                    ? new Date(schedule.updatedAt).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '—'}
                                </span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
