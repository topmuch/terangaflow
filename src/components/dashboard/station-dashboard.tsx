'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Lucide icons
import {
  Eye, CalendarClock, AlertTriangle, DoorOpen, Plus, Pencil, Trash2,
  Bus, Train, Ship, Clock, CheckCircle2, XCircle,
  Route, MapPin, Megaphone, Gauge, Timer, BarChart3, RefreshCw, Store,
  Bell, CreditCard, Palette,
} from 'lucide-react'

import { TripTable } from '@/components/dashboard/TripTable'
import { TickerManager } from '@/components/dashboard/TickerManager'
import { AnalyticsSection } from '@/components/dashboard/AnalyticsSection'
import { PartnersSection } from '@/components/dashboard/PartnersSection'
import { PushSection } from '@/components/dashboard/PushSection'
import BillingSection from '@/components/dashboard/BillingSection'
import { WhiteLabelSection } from '@/components/dashboard/WhiteLabelSection'
import { DisplayScreenPanel } from '@/components/dashboard/DisplayScreenPanel'
import { PendingMerchantsPanel } from '@/components/dashboard/PendingMerchantsPanel'

// ============================================================
// Types
// ============================================================

interface StationDashboardProps {
  stationId: string
  stationName: string
  stationCode: string
  initialTab?: string
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

interface Platform {
  id: string
  number: number
  name: string | null
  stationId: string
  lineId: string | null
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  station: { id: string; name: string; code: string }
  line: { id: string; name: string; code: string; color: string } | null
  _count: { schedules: number }
}

interface AnalyticsData {
  today: { views: number; scans: number; cancelled: number }
  week: { views: number }
  schedules: { total: number; active: number; delayed: number; boarding: number }
  recentEvents: Array<{ id: string; eventType: string; elementId: string; createdAt: string }>
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

// ============================================================
// Helpers
// ============================================================

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  SCHEDULED: { label: 'Prévu', icon: Clock, className: 'bg-sky-500/15 text-sky-400' },
  BOARDING: { label: 'Embarquement', icon: DoorOpen, className: 'bg-emerald-500/20 text-emerald-400' },
  DEPARTED: { label: 'Parti', icon: CheckCircle2, className: 'bg-zinc-500/15 text-zinc-500' },
  DELAYED: { label: 'Retardé', icon: AlertTriangle, className: 'bg-amber-500/20 text-amber-400' },
  CANCELLED: { label: 'Annulé', icon: XCircle, className: 'bg-red-500/20 text-red-400' },
}

const lineTypeIcons: Record<string, React.ElementType> = { BUS: Bus, TRAIN: Train, FERRY: Ship, TAXI: Clock }

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

export function StationDashboard({ stationId, stationName, stationCode, initialTab }: StationDashboardProps) {
  // Note: Parent must pass a changing `key` prop to force remount when tab changes externally (sidebar)
  const [activeTab, setActiveTab] = useState(initialTab || 'overview')

  return (
    <div className="w-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{stationName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Station Manager — <span className="font-mono font-semibold text-emerald-500">{stationCode}</span>
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
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Vue d&apos;ensemble</span>
              <span className="xs:hidden">Vue</span>
            </TabsTrigger>
            <TabsTrigger value="lines" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Route className="w-3.5 h-3.5" />
              Lignes
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <MapPin className="w-3.5 h-3.5" />
              Quais
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Timer className="w-3.5 h-3.5" />
              Horaires
            </TabsTrigger>
            <TabsTrigger value="ticker" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Megaphone className="w-3.5 h-3.5" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Store className="w-3.5 h-3.5" />
              Partenaires
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="push" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Bell className="w-3.5 h-3.5" />
              Push
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <CreditCard className="w-3.5 h-3.5" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="whitelabel" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Palette className="w-3.5 h-3.5" />
              Marque
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <Separator className="mt-0" />

        {/* Tab Content with AnimatePresence */}
        <div className="flex-1 min-h-0 mt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <OverviewTab stationId={stationId} />
                <div className="mt-6">
                  <PendingMerchantsPanel stationId={stationId} />
                </div>
                <div className="mt-6">
                  <DisplayScreenPanel stationId={stationId} stationName={stationName} stationCode={stationCode} />
                </div>
              </motion.div>
            )}
            {activeTab === 'lines' && (
              <motion.div key="lines" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <LinesTab stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'platforms' && (
              <motion.div key="platforms" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <PlatformsTab stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'schedules' && (
              <motion.div key="schedules" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <TripTable stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'ticker' && (
              <motion.div key="ticker" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <TickerManager stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'partners' && (
              <motion.div key="partners" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <PartnersSection stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <AnalyticsSection stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'push' && (
              <motion.div key="push" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <PushSection stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'billing' && (
              <motion.div key="billing" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <BillingSection stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'whitelabel' && (
              <motion.div key="whitelabel" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <WhiteLabelSection stationId={stationId} />
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

function OverviewTab({ stationId }: { stationId: string }) {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  const { data: departuresData, isLoading: departuresLoading } = useQuery<{ schedules: Departure[] }>({
    queryKey: ['departures-mini', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/departures?stationId=${stationId}&limit=10`)
      if (!res.ok) throw new Error('Failed to fetch departures')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  const departures: Departure[] = departuresData?.schedules?.slice(0, 10) || []

  const statCards = [
    {
      title: "Vues aujourd'hui",
      value: analytics?.today.views ?? 0,
      icon: Eye,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      sub: `${analytics?.week.views ?? 0} cette semaine`,
    },
    {
      title: 'Horaires actifs',
      value: analytics?.schedules.active ?? 0,
      icon: CalendarClock,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      sub: `${analytics?.schedules.total ?? 0} au total`,
    },
    {
      title: 'En retard',
      value: analytics?.schedules.delayed ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      sub: analytics?.today.cancelled ? `${analytics.today.cancelled} annulé(s)` : 'Aucune annulation',
    },
    {
      title: 'En embarquement',
      value: analytics?.schedules.boarding ?? 0,
      icon: DoorOpen,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      sub: `${analytics?.today.scans ?? 0} scans QR`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsLoading
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

      {/* Live Departures Mini-Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Départs en direct</CardTitle>
              <Badge variant="outline" className="text-xs gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              15s
            </p>
          </div>
          <CardDescription>10 prochains départs pour cette gare</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {departuresLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : departures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun départ prévu</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Ligne</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Quai</TableHead>
                  <TableHead>Départ</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="pr-4 text-right">Min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.map((dep) => {
                  const st = statusConfig[dep.status] || statusConfig.SCHEDULED
                  const StIcon = st.icon
                  const typeIcon = lineTypeIcons[dep.line.type] || Bus
                  return (
                    <TableRow key={dep.id} className={cn(dep.isUrgent && 'bg-emerald-500/5')}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono"
                            style={{
                              backgroundColor: `${dep.line.color}20`,
                              color: dep.line.color,
                              borderLeft: `3px solid ${dep.line.color}`,
                            }}
                          >
                            <typeIcon className="w-3 h-3" />
                            {dep.line.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{dep.line.destination}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {dep.platform ? dep.platform.number : '—'}
                      </TableCell>
                      <TableCell className="text-sm font-mono tabular-nums">
                        {dep.delayMinutes > 0 ? (
                          <span className="flex items-center gap-1.5">
                            <span className="text-amber-400 line-through text-xs">{dep.departureTime}</span>
                            <span className="text-foreground font-semibold">{dep.adjustedDepartureTime}</span>
                          </span>
                        ) : (
                          dep.departureTime
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold', st.className)}>
                          <StIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <span className={cn(
                          'text-sm font-mono font-bold tabular-nums',
                          dep.minutesUntil <= 5 && dep.minutesUntil >= 0 && 'text-emerald-400',
                          dep.minutesUntil < 0 && 'text-muted-foreground',
                        )}>
                          {dep.minutesUntil < 0 ? '—' : dep.minutesUntil === 0 ? 'Now' : `${dep.minutesUntil}`}
                        </span>
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
// Lines Tab
// ============================================================

function LinesTab({ stationId }: { stationId: string }) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '', code: '', destination: '', color: '#10b981',
    type: 'BUS', frequencyMinutes: '30',
  })

  // Fetch lines
  const { data: lines, isLoading } = useQuery<Line[]>({
    queryKey: ['lines', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/lines?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stationId, frequencyMinutes: parseInt(data.frequencyMinutes) || 30 }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] })
      toast.success('Ligne créée avec succès')
      setCreateOpen(false)
      setForm({ name: '', code: '', destination: '', color: '#10b981', type: 'BUS', frequencyMinutes: '30' })
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/lines?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] })
      toast.success('Ligne supprimée')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.code || !form.destination) {
      toast.error('Remplissez tous les champs obligatoires')
      return
    }
    createMutation.mutate(form)
  }

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold">Lignes de transport</h3>
          <p className="text-xs text-muted-foreground">{lines?.length ?? 0} ligne(s) configurée(s)</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4" />
              Nouvelle ligne
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une ligne</DialogTitle>
              <DialogDescription>Ajoutez une nouvelle ligne de transport à cette gare</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="line-code">Code *</Label>
                  <Input id="line-code" placeholder="D1, T12..." value={form.code} onChange={(e) => updateForm('code', e.target.value)} className="uppercase font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-type">Type</Label>
                  <Select value={form.type} onValueChange={(v) => updateForm('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUS">Bus</SelectItem>
                      <SelectItem value="TRAIN">Train</SelectItem>
                      <SelectItem value="FERRY">Ferry</SelectItem>
                      <SelectItem value="TAXI">Taxi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="line-name">Nom *</Label>
                <Input id="line-name" placeholder="Dakar - Saint-Louis" value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="line-destination">Destination *</Label>
                <Input id="line-destination" placeholder="Saint-Louis" value={form.destination} onChange={(e) => updateForm('destination', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="line-freq">Fréquence (min)</Label>
                  <Input id="line-freq" type="number" min="5" value={form.frequencyMinutes} onChange={(e) => updateForm('frequencyMinutes', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-color">Couleur</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={(e) => updateForm('color', e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer bg-transparent" />
                    <Input value={form.color} onChange={(e) => updateForm('color', e.target.value)} className="font-mono text-xs" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {createMutation.isPending ? 'Création...' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              <p className="text-sm">Aucune ligne configurée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Destination</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Fréquence</TableHead>
                  <TableHead className="hidden sm:table-cell">Couleur</TableHead>
                  <TableHead className="hidden lg:table-cell">Horaires</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const TypeIcon = lineTypeIcons[line.type] || Bus
                  return (
                    <TableRow key={line.id}>
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
                      <TableCell className="font-medium text-sm">{line.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{line.destination}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <TypeIcon className="w-3 h-3" />
                          {line.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm font-mono tabular-nums">{line.frequencyMinutes} min</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: line.color }} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm tabular-nums">{line._count.schedules}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer la ligne {line.code} ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action supprimera la ligne &quot;{line.name}&quot; et ses {line._count.schedules} horaire(s) associé(s).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => deleteMutation.mutate(line.id)}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
// Platforms Tab
// ============================================================

function PlatformsTab({ stationId }: { stationId: string }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)

  const emptyForm = { number: '', name: '', lineId: '', type: 'STANDARD' }
  const [form, setForm] = useState(emptyForm)

  // Fetch platforms
  const { data: platforms, isLoading } = useQuery<Platform[]>({
    queryKey: ['platforms', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/platforms?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  // Fetch lines (for the select dropdown)
  const { data: lines } = useQuery<Line[]>({
    queryKey: ['lines', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/lines?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })

  const openCreate = () => {
    setEditingPlatform(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (platform: Platform) => {
    setEditingPlatform(platform)
    setForm({
      number: String(platform.number),
      name: platform.name || '',
      lineId: platform.lineId || '',
      type: platform.type,
    })
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.number) { toast.error('Le numéro de quai est requis'); return }

    const payload = {
      number: parseInt(form.number),
      name: form.name || `Quai ${form.number}`,
      stationId,
      lineId: form.lineId || null,
      type: form.type,
    }

    if (editingPlatform) {
      updateMutation.mutate({ id: editingPlatform.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: { number: number; name: string; stationId: string; lineId: string | null; type: string }) => {
      const res = await fetch('/api/platforms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
      toast.success('Quai créé')
      setDialogOpen(false)
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; number: number; name: string; stationId: string; lineId: string | null; type: string }) => {
      const { id, ...rest } = data
      const res = await fetch('/api/platforms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...rest }) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
      toast.success('Quai mis à jour')
      setDialogOpen(false)
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const platformTypeBadge = (type: string) => {
    switch (type) {
      case 'VIP': return <Badge className="bg-amber-500/15 text-amber-400 text-xs">VIP</Badge>
      case 'EXPRESS': return <Badge className="bg-sky-500/15 text-sky-400 text-xs">Express</Badge>
      default: return <Badge variant="secondary" className="text-xs">Standard</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold">Quais / Plateformes</h3>
          <p className="text-xs text-muted-foreground">{platforms?.length ?? 0} quai(x) configuré(s)</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nouveau quai
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !platforms?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun quai configuré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Numéro</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Ligne assignée</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Horaires</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((platform) => (
                  <TableRow key={platform.id}>
                    <TableCell className="pl-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted font-mono font-bold text-sm">
                        {platform.number}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{platform.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {platform.line ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono"
                          style={{
                            backgroundColor: `${platform.line.color}20`,
                            color: platform.line.color,
                            borderLeft: `3px solid ${platform.line.color}`,
                          }}
                        >
                          {platform.line.code} — {platform.line.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{platformTypeBadge(platform.type)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm tabular-nums">{platform._count.schedules}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(platform)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlatform ? 'Modifier le quai' : 'Créer un quai'}</DialogTitle>
            <DialogDescription>
              {editingPlatform ? `Modifier le quai #${editingPlatform.number}` : 'Ajouter un nouveau quai à cette gare'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plat-num">Numéro *</Label>
                <Input id="plat-num" type="number" min="1" value={form.number} onChange={(e) => updateForm('number', e.target.value)} placeholder="1" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plat-type">Type</Label>
                <Select value={form.type} onValueChange={(v) => updateForm('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="EXPRESS">Express</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plat-name">Nom</Label>
              <Input id="plat-name" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Quai 1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plat-line">Ligne assignée</Label>
              <Select value={form.lineId} onValueChange={(v) => updateForm('lineId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune ligne" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune ligne</SelectItem>
                  {lines?.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      {line.code} — {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Enregistrement...'
                  : editingPlatform ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
