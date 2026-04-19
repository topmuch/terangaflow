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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Lucide icons
import {
  DollarSign, Key, Store, Bell, CreditCard, TrendingUp, Users,
  QrCode, BarChart3, Send, Shield, Crown, Star, Plus, Trash2,
  Pencil, Eye, EyeOff, Copy, Activity, Zap, Package,
  Megaphone, Percent, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Receipt, CalendarDays, Clock,
  RefreshCw, ArrowUpRight, ArrowDownRight, Banknote,
} from 'lucide-react'

// Recharts
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

// ============================================================
// Types
// ============================================================

interface MonetizationDashboardProps {
  tenantId: string
  stationId: string
  stationName: string
  userId: string
}

interface AnalyticsOverview {
  today: { views: number; scans: number }
  schedules: { active: number; delayed: number; boarding: number }
  recentEvents: Array<{ id: string; eventType: string; elementId: string; createdAt: string }>
}

interface ApiKey {
  id: string
  name: string
  key: string
  rateLimit: number
  isActive: boolean
  callsLastHour: number
  callsLastDay: number
  _count: { usageLogs: number }
}

interface Merchant {
  id: string
  name: string
  description: string
  category: string
  phone: string
  isActive: boolean
  _count: { qrScans: number; offers: number }
  offers: Offer[]
}

interface Offer {
  id: string
  title: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  isActive: boolean
  merchantId?: string
}

interface SubscriptionData {
  subscriptions: Array<{
    id: string
    plan: string
    status: string
    currentPeriodEnd: string
    createdAt: string
  }>
  active: { plan: string; currentPeriodEnd: string } | null
}

interface Invoice {
  id: string
  date: string
  description: string
  plan: string
  amount: number
  status: 'PAID' | 'PENDING' | 'FAILED'
}

interface InvoiceData {
  invoices: Invoice[]
  totalPaid: number
  totalPending: number
}

interface NotificationLog {
  id: string
  title: string
  type: string
  sentCount: number
  createdAt: string
}

interface UsageData {
  summary: {
    totalCalls: number
    totalCost: number
    avgCallsPerDay: number
    estimatedMonthlyCost: number
  }
  chartData: Array<{ date: string; calls: number }>
  topEndpoints: Array<{ endpoint: string; calls: number }>
}

// ============================================================
// Helpers
// ============================================================

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'sk_live_'
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function maskKey(key: string): string {
  if (key.length <= 12) return key
  return key.slice(0, 8) + '•'.repeat(24) + key.slice(-4)
}

function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function daysRemaining(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  RESTAURANT: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Restaurant' },
  SHOP: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Boutique' },
  TRANSPORT: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'Transport' },
  SERVICE: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Service' },
}

const NOTIFICATION_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  INFO: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'Info' },
  DELAY: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Retard' },
  PLATFORM_CHANGE: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Changement' },
  PROMO: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Promo' },
}

const PLANS = [
  {
    id: 'analytics_premium',
    name: 'Analytics Premium',
    price: 49,
    icon: BarChart3,
    color: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    features: ['Suivi en temps réel', 'Heatmaps interactives', 'Rapports exportables', 'Alertes intelligentes', 'API analytics avancée'],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    price: 29,
    icon: Store,
    color: 'border-purple-500/30',
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-400',
    features: ['Gestion commerces', 'Offres & promotions', 'QR Codes dynamiques', 'Statistiques marchands', 'Notifications push'],
  },
  {
    id: 'pack_bienvenue',
    name: 'Pack Bienvenue',
    price: 99,
    icon: Crown,
    color: 'border-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    features: ['Analytics Premium', 'Marketplace complet', 'Support prioritaire', 'Marque blanche', 'API illimitée', 'Formation dédiée'],
  },
  {
    id: 'white_label',
    name: 'White Label',
    price: 199,
    icon: Shield,
    color: 'border-sky-500/30',
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
    features: ['Marque blanche complète', 'Domaine personnalisé', 'CDN dédié', 'SLA 99.9%', 'Account manager', 'Toutes les fonctionnalités'],
  },
]

const COMMISSION_DATA = [
  { partner: 'Restaurant Le Terranga', type: 'Repas', transactions: 156, rate: 15, amount: 35100 },
  { partner: 'Taxi Dakar Express', type: 'Transport', transactions: 243, rate: 10, amount: 24300 },
  { partner: 'Boutique Souvenirs du Sénégal', type: 'Boutique', transactions: 89, rate: 5, amount: 4450 },
  { partner: 'Cyber Café Plateau', type: 'Service', transactions: 67, rate: 5, amount: 3350 },
  { partner: 'Restaurant Chez Maman', type: 'Repas', transactions: 201, rate: 15, amount: 45225 },
  { partner: 'Transport Dem Dikk', type: 'Transport', transactions: 178, rate: 10, amount: 17800 },
  { partner: 'Boutique Artisanal Gorée', type: 'Boutique', transactions: 112, rate: 5, amount: 5600 },
  { partner: 'Service Lavage Auto Plus', type: 'Service', transactions: 45, rate: 5, amount: 2250 },
]

const COMMISSION_RATES = [
  { type: 'Taxi / Transport', rate: 10, color: 'text-sky-400', icon: Activity },
  { type: 'Repas / Restaurant', rate: 15, color: 'text-amber-400', icon: Star },
  { type: 'Autres services', rate: 5, color: 'text-purple-400', icon: Package },
]

// ============================================================
// Tab transition variant
// ============================================================

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ============================================================
// Recharts Custom Tooltip
// ============================================================

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold text-foreground">{p.name}: {new Intl.NumberFormat('fr-FR').format(p.value)}</p>
      ))}
    </div>
  )
}

// ============================================================
// KPI Card Component
// ============================================================

function KpiCard({ title, value, subtitle, icon: Icon, color, bgColor, borderColor }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn('border', borderColor, 'overflow-hidden')}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bgColor)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function MonetizationDashboard({ tenantId, stationId, stationName, userId }: MonetizationDashboardProps) {
  const [activeTab, setActiveTab] = useState('analytics')

  return (
    <div className="w-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Crown className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">Monétisation</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3 h-3" />
              SUPERADMIN — <span className="font-semibold text-purple-400">{stationName}</span>
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-mono gap-1.5 border-purple-500/30 text-purple-400">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          Premium
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        <ScrollArea className="w-full -mb-px">
          <TabsList className="w-full sm:w-auto flex sm:inline-flex h-auto sm:h-9 p-1 gap-1 bg-muted/50">
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Ana</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Store className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Marketplace</span>
              <span className="sm:hidden">Marché</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Abonnements</span>
              <span className="sm:hidden">Abo</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Notifs</span>
            </TabsTrigger>
            <TabsTrigger value="commissions" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Percent className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Commissions</span>
              <span className="sm:hidden">Comm</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <Separator className="mt-0" />

        {/* Tab Content */}
        <div className="flex-1 min-h-0 mt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'analytics' && (
              <motion.div key="analytics" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <AnalyticsPremiumTab stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'api' && (
              <motion.div key="api" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <ApiManagementTab stationId={stationId} userId={userId} />
              </motion.div>
            )}
            {activeTab === 'marketplace' && (
              <motion.div key="marketplace" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <MarketplaceTab stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'subscriptions' && (
              <motion.div key="subscriptions" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <SubscriptionsTab tenantId={tenantId} stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <NotificationsTab stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'commissions' && (
              <motion.div key="commissions" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <CommissionsTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  )
}

// ============================================================
// Tab 1: Analytics Premium
// ============================================================

function AnalyticsPremiumTab({ stationId }: { stationId: string }) {
  const { data: analytics, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics-overview', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/overview?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })

  const { data: usageData } = useQuery<UsageData>({
    queryKey: ['usage', stationId, 7],
    queryFn: async () => {
      const res = await fetch(`/api/usage?stationId=${stationId}&days=7`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 60000,
  })

  // Group recentEvents by date for bar chart
  const events = analytics?.recentEvents
  const chartData = useMemo(() => {
    if (!events?.length) return []
    const grouped: Record<string, number> = {}
    events.forEach((ev) => {
      const day = new Date(ev.createdAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      grouped[day] = (grouped[day] || 0) + 1
    })
    return Object.entries(grouped).map(([date, views]) => ({ date, views }))
  }, [events])

  // Event types breakdown
  const eventTypeBreakdown = useMemo(() => {
    if (!events?.length) return []
    const counts: Record<string, number> = {}
    events.forEach((ev) => {
      counts[ev.eventType] = (counts[ev.eventType] || 0) + 1
    })
    return Object.entries(counts).map(([type, count]) => ({ type, count }))
  }, [events])

  const totalRevenue = usageData?.summary?.totalCost
    ? Math.round(usageData.summary.totalCost * 655.96)
    : 0

  return (
    <div className="space-y-6">
      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Total Revenu"
              value={formatXOF(totalRevenue)}
              subtitle="Estimé ce mois"
              icon={DollarSign}
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
              borderColor="border-emerald-500/20"
            />
            <KpiCard
              title="API Calls (mois)"
              value={usageData?.summary?.totalCalls?.toLocaleString('fr-FR') ?? '—'}
              subtitle={`${usageData?.summary?.avgCallsPerDay?.toFixed(0) ?? 0}/jour en moyenne`}
              icon={Zap}
              color="text-purple-400"
              bgColor="bg-purple-500/10"
              borderColor="border-purple-500/20"
            />
            <KpiCard
              title="Coût estimé"
              value={`${usageData?.summary?.estimatedMonthlyCost?.toFixed(2) ?? '—'} €/mois`}
              subtitle="Hébergement & API"
              icon={Banknote}
              color="text-amber-400"
              bgColor="bg-amber-500/10"
              borderColor="border-amber-500/20"
            />
            <KpiCard
              title="Merchants actifs"
              value={analytics?.schedules.active ?? '—'}
              subtitle={`${analytics?.schedules.delayed ?? 0} en attente`}
              icon={Store}
              color="text-sky-400"
              bgColor="bg-sky-500/10"
              borderColor="border-sky-500/20"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart - Daily Views */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Vues quotidiennes</CardTitle>
              <Badge variant="outline" className="text-xs">7 jours</Badge>
            </div>
            <CardDescription>Nombre de vues par jour sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="views" name="Vues" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">QR Scans</p>
                  <p className="text-xl font-bold text-emerald-400 tabular-nums">{analytics?.today.scans ?? 0}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Scans aujourd&apos;hui</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Types d&apos;événements</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {eventTypeBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun événement</p>
              ) : (
                <div className="space-y-2">
                  {eventTypeBreakdown.map((et) => (
                    <div key={et.type} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{et.type}</span>
                      <Badge variant="secondary" className="text-xs tabular-nums">{et.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vues aujourd&apos;hui</p>
                  <p className="text-xl font-bold text-purple-400 tabular-nums">{analytics?.today.views ?? 0}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Pages consultées</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab 2: API Management
// ============================================================

function ApiManagementTab({ stationId, userId }: { stationId: string; userId: string }) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('100')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys', userId, stationId],
    queryFn: async () => {
      const res = await fetch(`/api/api-keys?userId=${userId}&stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  // Fetch usage data
  const { data: usageData } = useQuery<UsageData>({
    queryKey: ['usage', stationId, 7],
    queryFn: async () => {
      const res = await fetch(`/api/usage?stationId=${stationId}&days=7`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 60000,
  })

  // Create key mutation
  const createKeyMutation = useMutation({
    mutationFn: async () => {
      const newKey = generateApiKey()
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, stationId,
          name: newKeyName,
          rateLimit: parseInt(newKeyRateLimit) || 100,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return newKey
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success(`Clé API créée avec succès !`)
      toast(`Clé API (copiez-la maintenant) : ${newKey}`, { duration: 15000 })
      setCreateOpen(false)
      setNewKeyName('')
      setNewKeyRateLimit('100')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Toggle key mutation
  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch('/api/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('Clé API mise à jour')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Delete key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('Clé API supprimée')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const totalCallsToday = apiKeys?.reduce((sum, k) => sum + k.callsLastDay, 0) ?? 0
  const topEndpoint = usageData?.topEndpoints?.[0]?.endpoint ?? '—'

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Total clés"
              value={apiKeys?.length ?? 0}
              subtitle={`${apiKeys?.filter((k) => k.isActive).length ?? 0} actives`}
              icon={Key}
              color="text-purple-400"
              bgColor="bg-purple-500/10"
              borderColor="border-purple-500/20"
            />
            <KpiCard
              title="Appels / jour"
              value={totalCallsToday.toLocaleString('fr-FR')}
              subtitle={`${apiKeys?.reduce((s, k) => s + k.callsLastHour, 0) ?? 0}/heure`}
              icon={Activity}
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
              borderColor="border-emerald-500/20"
            />
            <KpiCard
              title="Coût estimé / mois"
              value={`${usageData?.summary?.estimatedMonthlyCost?.toFixed(2) ?? '—'} €`}
              subtitle={`${usageData?.summary?.totalCost?.toFixed(2) ?? '—'} € (7j)`}
              icon={Banknote}
              color="text-amber-400"
              bgColor="bg-amber-500/10"
              borderColor="border-amber-500/20"
            />
            <KpiCard
              title="Top endpoint"
              value="—"
              subtitle={topEndpoint.length > 28 ? topEndpoint.slice(0, 28) + '...' : topEndpoint}
              icon={Zap}
              color="text-sky-400"
              bgColor="bg-sky-500/10"
              borderColor="border-sky-500/20"
            />
          </>
        )}
      </div>

      {/* API Calls Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Appels API (7 jours)</CardTitle>
            <Badge variant="outline" className="text-xs">Dernière semaine</Badge>
          </div>
          <CardDescription>Volume d&apos;appels API quotidiens</CardDescription>
        </CardHeader>
        <CardContent>
          {usageData?.chartData ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    name="Appels"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Skeleton className="h-56 w-full" />
          )}
        </CardContent>
      </Card>

      {/* API Keys Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Clés API</CardTitle>
              <CardDescription>Gérez vos clés d&apos;accès API</CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4" />
                  Créer une clé
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer une clé API</DialogTitle>
                  <DialogDescription>Une nouvelle clé sera générée automatiquement. Sauvegardez-la !</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Nom de la clé *</Label>
                    <Input id="key-name" placeholder="ex: Production API" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key-rate">Rate limit (req/min)</Label>
                    <Input id="key-rate" type="number" min="1" max="10000" value={newKeyRateLimit} onChange={(e) => setNewKeyRateLimit(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                    <Button
                      onClick={() => createKeyMutation.mutate()}
                      disabled={createKeyMutation.isPending || !newKeyName}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {createKeyMutation.isPending ? 'Création...' : 'Générer la clé'}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !apiKeys?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune clé API configurée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Nom</TableHead>
                  <TableHead>Clé</TableHead>
                  <TableHead className="hidden sm:table-cell">Rate Limit</TableHead>
                  <TableHead className="hidden md:table-cell">Appels/h</TableHead>
                  <TableHead className="hidden lg:table-cell">Appels/j</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => {
                  const isVisible = visibleKeys.has(apiKey.id)
                  return (
                    <TableRow key={apiKey.id}>
                      <TableCell className="pl-4 font-medium text-sm">{apiKey.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                            {isVisible ? apiKey.key : maskKey(apiKey.key)}
                          </code>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleKeyVisibility(apiKey.id)}>
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(apiKey.key)
                              toast.success('Clé copiée !')
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm font-mono tabular-nums">{apiKey.rateLimit}/min</TableCell>
                      <TableCell className="hidden md:table-cell text-sm tabular-nums">{apiKey.callsLastHour}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm tabular-nums">{apiKey.callsLastDay}</TableCell>
                      <TableCell>
                        <Switch
                          checked={apiKey.isActive}
                          onCheckedChange={(checked) => toggleKeyMutation.mutate({ id: apiKey.id, isActive: checked })}
                        />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400"
                          onClick={() => deleteKeyMutation.mutate(apiKey.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
// Tab 3: Marketplace
// ============================================================

function MarketplaceTab({ stationId }: { stationId: string }) {
  const queryClient = useQueryClient()
  const [createMerchantOpen, setCreateMerchantOpen] = useState(false)
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null)
  const [newOfferMerchantId, setNewOfferMerchantId] = useState<string | null>(null)

  // Merchant form
  const [merchantForm, setMerchantForm] = useState({ name: '', description: '', category: 'RESTAURANT', phone: '' })

  // Offer form
  const [offerForm, setOfferForm] = useState({ title: '', description: '', discountType: 'PERCENTAGE', discountValue: '' })

  // Fetch merchants
  const { data: merchants, isLoading } = useQuery<Merchant[]>({
    queryKey: ['merchants', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })

  // Create merchant mutation
  const createMerchantMutation = useMutation({
    mutationFn: async (data: typeof merchantForm) => {
      const res = await fetch('/api/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, ...data }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
      toast.success('Commerce ajouté avec succès')
      setCreateMerchantOpen(false)
      setMerchantForm({ name: '', description: '', category: 'RESTAURANT', phone: '' })
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Toggle merchant mutation
  const toggleMerchantMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch('/api/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
      toast.success('Commerce mis à jour')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Delete merchant mutation
  const deleteMerchantMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/merchants?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
      toast.success('Commerce supprimé')
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async ({ merchantId, ...data }: { merchantId: string; title: string; description: string; discountType: string; discountValue: number }) => {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId, ...data }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
      toast.success('Offre ajoutée')
      setNewOfferMerchantId(null)
      setOfferForm({ title: '', description: '', discountType: 'PERCENTAGE', discountValue: '' })
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  // Toggle offer mutation
  const toggleOfferMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
    },
  })

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/offers?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
      toast.success('Offre supprimée')
    },
  })

  const totalQrScans = merchants?.reduce((sum, m) => sum + m._count.qrScans, 0) ?? 0
  const totalOffers = merchants?.reduce((sum, m) => sum + m._count.offers, 0) ?? 0
  const categories = new Set(merchants?.map((m) => m.category) ?? [])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Merchants"
              value={merchants?.length ?? 0}
              subtitle={`${merchants?.filter((m) => m.isActive).length ?? 0} actifs`}
              icon={Store}
              color="text-purple-400"
              bgColor="bg-purple-500/10"
              borderColor="border-purple-500/20"
            />
            <KpiCard
              title="Offres actives"
              value={totalOffers}
              subtitle={`${totalOffers} promotion(s) en cours`}
              icon={Star}
              color="text-amber-400"
              bgColor="bg-amber-500/10"
              borderColor="border-amber-500/20"
            />
            <KpiCard
              title="QR Scans total"
              value={totalQrScans.toLocaleString('fr-FR')}
              subtitle="Tous les commerces"
              icon={QrCode}
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
              borderColor="border-emerald-500/20"
            />
            <KpiCard
              title="Catégories"
              value={categories.size}
              subtitle={Array.from(categories).map((c) => CATEGORY_COLORS[c]?.label ?? c).join(', ') || '—'}
              icon={Package}
              color="text-sky-400"
              bgColor="bg-sky-500/10"
              borderColor="border-sky-500/20"
            />
          </>
        )}
      </div>

      {/* Merchants Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Commerces & Marchands</CardTitle>
              <CardDescription>Gérez les commerces et leurs offres promotionnelles</CardDescription>
            </div>
            <Dialog open={createMerchantOpen} onOpenChange={setCreateMerchantOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4" />
                  Ajouter un commerce
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Ajouter un commerce</DialogTitle>
                  <DialogDescription>Enregistrez un nouveau commerce dans la marketplace</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="m-name">Nom *</Label>
                    <Input id="m-name" placeholder="Restaurant Le Terranga" value={merchantForm.name} onChange={(e) => setMerchantForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="m-desc">Description</Label>
                    <Textarea id="m-desc" placeholder="Description du commerce..." value={merchantForm.description} onChange={(e) => setMerchantForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="m-cat">Catégorie</Label>
                      <Select value={merchantForm.category} onValueChange={(v) => setMerchantForm((p) => ({ ...p, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                          <SelectItem value="SHOP">Boutique</SelectItem>
                          <SelectItem value="TRANSPORT">Transport</SelectItem>
                          <SelectItem value="SERVICE">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="m-phone">Téléphone</Label>
                      <Input id="m-phone" placeholder="+221 77 123 45 67" value={merchantForm.phone} onChange={(e) => setMerchantForm((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateMerchantOpen(false)}>Annuler</Button>
                    <Button
                      onClick={() => {
                        if (!merchantForm.name) { toast.error('Le nom est requis'); return }
                        createMerchantMutation.mutate(merchantForm)
                      }}
                      disabled={createMerchantMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {createMerchantMutation.isPending ? 'Ajout...' : 'Ajouter'}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !merchants?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun commerce enregistré</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {merchants.map((merchant) => {
                const cat = CATEGORY_COLORS[merchant.category] || { bg: 'bg-muted', text: 'text-muted-foreground', label: merchant.category }
                const isExpanded = expandedMerchant === merchant.id
                const isAddingOffer = newOfferMerchantId === merchant.id
                return (
                  <div key={merchant.id}>
                    <div
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors border-b last:border-b-0"
                      onClick={() => setExpandedMerchant(isExpanded ? null : merchant.id)}
                    >
                      <div className="w-6 h-6 flex items-center justify-center text-muted-foreground shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{merchant.name}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded font-medium', cat.bg, cat.text)}>
                            {cat.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{merchant.phone || 'Pas de téléphone'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            {merchant._count.qrScans}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {merchant._count.offers}
                          </span>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={merchant.isActive}
                            onCheckedChange={(checked) => toggleMerchantMutation.mutate({ id: merchant.id, isActive: checked })}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMerchantMutation.mutate(merchant.id)
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded: Offers */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-muted/20 border-b"
                        >
                          <div className="px-4 py-3 space-y-3">
                            {merchant.description && (
                              <p className="text-xs text-muted-foreground">{merchant.description}</p>
                            )}

                            {/* Offers list */}
                            {merchant.offers && merchant.offers.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">Offres ({merchant.offers.length})</p>
                                {merchant.offers.map((offer) => (
                                  <div key={offer.id} className="flex items-center gap-2 bg-background rounded-lg p-2 border">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">{offer.title}</span>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}%` : `${offer.discountValue} XOF`}
                                        </Badge>
                                      </div>
                                      {offer.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{offer.description}</p>
                                      )}
                                    </div>
                                    <Switch
                                      checked={offer.isActive}
                                      onCheckedChange={(checked) => toggleOfferMutation.mutate({ id: offer.id, isActive: checked })}
                                      className="shrink-0"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-red-400 shrink-0"
                                      onClick={() => deleteOfferMutation.mutate(offer.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Aucune offre pour ce commerce</p>
                            )}

                            {/* Add offer form */}
                            {isAddingOffer ? (
                              <div className="bg-background rounded-lg border p-3 space-y-3">
                                <p className="text-xs font-semibold">Nouvelle offre</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Titre *</Label>
                                    <Input
                                      placeholder="Réduction -10%"
                                      value={offerForm.title}
                                      onChange={(e) => setOfferForm((p) => ({ ...p, title: e.target.value }))}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <Select value={offerForm.discountType} onValueChange={(v) => setOfferForm((p) => ({ ...p, discountType: v }))}>
                                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="PERCENTAGE">Pourcentage (%)</SelectItem>
                                        <SelectItem value="FIXED">Montant fixe (XOF)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Valeur *</Label>
                                    <Input
                                      type="number"
                                      placeholder={offerForm.discountType === 'PERCENTAGE' ? '10' : '5000'}
                                      value={offerForm.discountValue}
                                      onChange={(e) => setOfferForm((p) => ({ ...p, discountValue: e.target.value }))}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1 sm:col-span-2">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                      placeholder="Description de l'offre..."
                                      value={offerForm.description}
                                      onChange={(e) => setOfferForm((p) => ({ ...p, description: e.target.value }))}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (!offerForm.title || !offerForm.discountValue) { toast.error('Remplissez les champs requis'); return }
                                      createOfferMutation.mutate({
                                        merchantId: merchant.id,
                                        title: offerForm.title,
                                        description: offerForm.description,
                                        discountType: offerForm.discountType,
                                        discountValue: parseFloat(offerForm.discountValue),
                                      })
                                    }}
                                    disabled={createOfferMutation.isPending}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                                  >
                                    {createOfferMutation.isPending ? 'Ajout...' : 'Ajouter'}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setNewOfferMerchantId(null); setOfferForm({ title: '', description: '', discountType: 'PERCENTAGE', discountValue: '' }) }}>
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 h-7 text-xs"
                                onClick={() => setNewOfferMerchantId(merchant.id)}
                              >
                                <Plus className="w-3 h-3" />
                                Ajouter une offre
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab 4: Abonnements & Factures
// ============================================================

function SubscriptionsTab({ tenantId, stationId }: { tenantId: string; stationId: string }) {
  const queryClient = useQueryClient()
  const [subscribePlan, setSubscribePlan] = useState<string | null>(null)
  const [subscribeMonths, setSubscribeMonths] = useState(1)

  // Fetch subscriptions
  const { data: subData, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ['subscriptions', tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions?tenantId=${tenantId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })

  // Fetch invoices
  const { data: invoiceData, isLoading: invLoading } = useQuery<InvoiceData>({
    queryKey: ['invoices', tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?tenantId=${tenantId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async ({ plan, months }: { plan: string; months: number }) => {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, plan, months }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Abonnement activé avec succès !')
      setSubscribePlan(null)
      setSubscribeMonths(1)
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const activePlan = subData?.active
  const days = activePlan?.currentPeriodEnd ? daysRemaining(activePlan.currentPeriodEnd) : 0

  return (
    <div className="space-y-6">
      {/* Active Subscription Card */}
      {activePlan && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{activePlan.plan}</h3>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Actif</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Expire le {formatDate(activePlan.currentPeriodEnd)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {days} jour(s) restant(s)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-16 h-16 relative mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray={`${Math.min(100, (days / 30) * 100)}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-400">{days}j</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plans Grid */}
      <div>
        <h3 className="text-base font-semibold mb-3">Plans disponibles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const PlanIcon = plan.icon
            const isSubscribing = subscribePlan === plan.id
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn('h-full flex flex-col', plan.color)}>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', plan.iconBg)}>
                        <PlanIcon className={cn('w-5 h-5', plan.iconColor)} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{plan.name}</h4>
                        <p className="text-xl font-bold">
                          <span className={plan.iconColor}>{plan.price}€</span>
                          <span className="text-xs text-muted-foreground font-normal">/mois</span>
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-4 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0', plan.iconColor)} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {isSubscribing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {[1, 3, 12].map((m) => (
                            <Button
                              key={m}
                              size="sm"
                              variant={subscribeMonths === m ? 'default' : 'outline'}
                              className={cn('flex-1 h-7 text-xs', subscribeMonths === m && 'bg-purple-600 hover:bg-purple-700')}
                              onClick={() => setSubscribeMonths(m)}
                            >
                              {m} mois
                            </Button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
                            disabled={subscribeMutation.isPending}
                            onClick={() => subscribeMutation.mutate({ plan: plan.id, months: subscribeMonths })}
                          >
                            {subscribeMutation.isPending ? 'En cours...' : `Souscrire (${plan.price * subscribeMonths}€)`}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSubscribePlan(null)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={() => setSubscribePlan(plan.id)}
                      >
                        Souscrire
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Factures</CardTitle>
            {invoiceData && (
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
                  Payées: {formatXOF(invoiceData.totalPaid)}
                </Badge>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                  En attente: {formatXOF(invoiceData.totalPending)}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !invoiceData?.invoices?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune facture</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Plan</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="pr-4 text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceData.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-4 text-sm">{formatDate(inv.date)}</TableCell>
                      <TableCell className="text-sm">{inv.description}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">{inv.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono tabular-nums">{formatXOF(inv.amount)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Badge
                          className={cn(
                            'text-xs',
                            inv.status === 'PAID' && 'bg-emerald-500/15 text-emerald-400',
                            inv.status === 'PENDING' && 'bg-amber-500/15 text-amber-400',
                            inv.status === 'FAILED' && 'bg-red-500/15 text-red-400',
                          )}
                        >
                          {inv.status === 'PAID' ? 'Payée' : inv.status === 'PENDING' ? 'En attente' : 'Échouée'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab 5: Notifications Push
// ============================================================

function NotificationsTab({ stationId }: { stationId: string }) {
  const queryClient = useQueryClient()
  const [notifForm, setNotifForm] = useState({ title: '', body: '', type: 'INFO', targetAll: true })

  // Fetch push subscription count
  const { data: pushCount, isLoading: pushLoading } = useQuery<number>({
    queryKey: ['push-count', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?stationId=${stationId}&type=subscriptions`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data?.pushSubscriptionCount ?? 0
    },
    refetchInterval: 30000,
  })

  // Fetch notification logs
  const { data: notificationLogs, isLoading: logsLoading } = useQuery<NotificationLog[]>({
    queryKey: ['notification-logs', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return Array.isArray(json.data) ? json.data : []
    },
    refetchInterval: 30000,
  })

  // Send notification mutation
  const sendNotifMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId,
          title: notifForm.title,
          body: notifForm.body,
          type: notifForm.type,
          targetAll: notifForm.targetAll,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] })
      toast.success('Notification envoyée avec succès !')
      setNotifForm({ title: '', body: '', type: 'INFO', targetAll: true })
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  })

  const totalSent = notificationLogs?.reduce((sum, n) => sum + (n.sentCount || 0), 0) ?? 0
  const deliveryRate = totalSent > 0 && pushCount ? Math.round((totalSent / (pushCount * 3)) * 100) : 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {pushLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Abonnés push"
              value={pushCount ?? 0}
              subtitle="Appareils inscrits"
              icon={Users}
              color="text-purple-400"
              bgColor="bg-purple-500/10"
              borderColor="border-purple-500/20"
            />
            <KpiCard
              title="Notifications envoyées"
              value={totalSent.toLocaleString('fr-FR')}
              subtitle={`${notificationLogs?.length ?? 0} campagnes`}
              icon={Send}
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
              borderColor="border-emerald-500/20"
            />
            <KpiCard
              title="Taux de délivrance"
              value={`${deliveryRate}%`}
              subtitle="Basé sur les 3 derniers envois"
              icon={Activity}
              color="text-amber-400"
              bgColor="bg-amber-500/10"
              borderColor="border-amber-500/20"
            />
          </>
        )}
      </div>

      {/* Send Notification Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Envoyer une notification</CardTitle>
          <CardDescription>Créez et envoyez une notification push à vos utilisateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notif-title">Titre *</Label>
                <Input
                  id="notif-title"
                  placeholder="Nouvelle information importante"
                  value={notifForm.title}
                  onChange={(e) => setNotifForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notif-type">Type</Label>
                <Select value={notifForm.type} onValueChange={(v) => setNotifForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Information</SelectItem>
                    <SelectItem value="DELAY">Retard</SelectItem>
                    <SelectItem value="PLATFORM_CHANGE">Changement de quai</SelectItem>
                    <SelectItem value="PROMO">Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-body">Message *</Label>
              <Textarea
                id="notif-body"
                placeholder="Contenu de la notification..."
                rows={3}
                value={notifForm.body}
                onChange={(e) => setNotifForm((p) => ({ ...p, body: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="notif-target"
                checked={notifForm.targetAll}
                onCheckedChange={(checked) => setNotifForm((p) => ({ ...p, targetAll: checked === true }))}
              />
              <Label htmlFor="notif-target" className="text-sm">
                Envoyer à tous les abonnés ({pushCount ?? 0} appareils)
              </Label>
            </div>
            <Button
              onClick={() => {
                if (!notifForm.title || !notifForm.body) { toast.error('Titre et message sont requis'); return }
                sendNotifMutation.mutate()
              }}
              disabled={sendNotifMutation.isPending}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {sendNotifMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer la notification
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historique des notifications</CardTitle>
          <CardDescription>Dernières notifications envoyées</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !notificationLogs?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune notification envoyée</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="pr-4 text-right">Envoyés</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notificationLogs.map((log) => {
                    const typeConf = NOTIFICATION_TYPE_COLORS[log.type] || { bg: 'bg-muted', text: 'text-muted-foreground', label: log.type }
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="pl-4 text-sm">{formatDate(log.createdAt)}</TableCell>
                        <TableCell className="text-sm font-medium">{log.title}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={cn('text-xs', typeConf.bg, typeConf.text)}>{typeConf.label}</Badge>
                        </TableCell>
                        <TableCell className="pr-4 text-right text-sm tabular-nums">{log.sentCount?.toLocaleString('fr-FR') ?? 0}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab 6: Commissions
// ============================================================

function CommissionsTab() {
  const totalCommission = COMMISSION_DATA.reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="space-y-6">
      {/* Commission Rates Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {COMMISSION_RATES.map((rate) => {
          const RateIcon = rate.icon
          return (
            <motion.div key={rate.type} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', rate.color === 'text-sky-400' ? 'bg-sky-500/10' : rate.color === 'text-amber-400' ? 'bg-amber-500/10' : 'bg-purple-500/10')}>
                      <RateIcon className={cn('w-6 h-6', rate.color)} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{rate.type}</p>
                      <p className={cn('text-2xl font-bold', rate.color)}>{rate.rate}%</p>
                      <p className="text-xs text-muted-foreground">Commission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Monthly Total Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total commissions (mois en cours)</p>
                  <p className="text-3xl font-bold text-emerald-400 tabular-nums">{formatXOF(totalCommission)}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    +12.5% vs mois précédent
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs text-muted-foreground">Transactions totales</p>
                <p className="text-xl font-bold tabular-nums">{COMMISSION_DATA.reduce((s, c) => s + c.transactions, 0).toLocaleString('fr-FR')}</p>
                <p className="text-xs text-muted-foreground">ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Commission Details Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Détail des commissions</CardTitle>
            <Badge variant="outline" className="text-xs">Mois en cours</Badge>
          </div>
          <CardDescription>Commission calculée par partenaire et type d&apos;activité</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Partenaire</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Commission %</TableHead>
                  <TableHead className="pr-4 text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMMISSION_DATA.map((row, idx) => {
                  const typeColor = row.type === 'Repas' ? 'text-amber-400' : row.type === 'Transport' ? 'text-sky-400' : 'text-purple-400'
                  const typeBg = row.type === 'Repas' ? 'bg-amber-500/15' : row.type === 'Transport' ? 'bg-sky-500/15' : 'bg-purple-500/15'
                  return (
                    <TableRow key={idx}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', typeBg)}>
                            <Store className={cn('w-4 h-4', typeColor)} />
                          </div>
                          <span className="text-sm font-medium">{row.partner}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={cn('text-xs', typeBg, typeColor)}>{row.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{row.transactions.toLocaleString('fr-FR')}</TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm tabular-nums">
                        <span className={typeColor}>{row.rate}%</span>
                      </TableCell>
                      <TableCell className="pr-4 text-right text-sm font-mono font-semibold tabular-nums text-emerald-400">
                        {formatXOF(row.amount)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="pl-4 font-semibold">Total</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {COMMISSION_DATA.reduce((s, c) => s + c.transactions, 0).toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell className="hidden md:table-cell" />
                  <TableCell className="pr-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                    {formatXOF(totalCommission)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart - Commission Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Répartition par type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Transport', value: COMMISSION_DATA.filter(c => c.type === 'Transport').reduce((s, c) => s + c.amount, 0) },
                      { name: 'Repas', value: COMMISSION_DATA.filter(c => c.type === 'Repas').reduce((s, c) => s + c.amount, 0) },
                      { name: 'Boutique', value: COMMISSION_DATA.filter(c => c.type === 'Boutique').reduce((s, c) => s + c.amount, 0) },
                      { name: 'Service', value: COMMISSION_DATA.filter(c => c.type === 'Service').reduce((s, c) => s + c.amount, 0) },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#38bdf8" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#a855f7" />
                    <Cell fill="#34d399" />
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatXOF(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 min-w-[160px]">
              {[
                { label: 'Transport', color: '#38bdf8', amount: COMMISSION_DATA.filter(c => c.type === 'Transport').reduce((s, c) => s + c.amount, 0) },
                { label: 'Repas', color: '#f59e0b', amount: COMMISSION_DATA.filter(c => c.type === 'Repas').reduce((s, c) => s + c.amount, 0) },
                { label: 'Boutique', color: '#a855f7', amount: COMMISSION_DATA.filter(c => c.type === 'Boutique').reduce((s, c) => s + c.amount, 0) },
                { label: 'Service', color: '#34d399', amount: COMMISSION_DATA.filter(c => c.type === 'Service').reduce((s, c) => s + c.amount, 0) },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                  <span className="text-xs font-mono tabular-nums">{formatXOF(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
