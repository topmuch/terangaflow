'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useKioskMode } from '@/hooks/use-kiosk-mode'
import { useAuthStore, getRoleLabel, getRoleColor } from '@/lib/auth-store'
import { LiveClock } from '@/components/display/LiveClock'
import { TickerBar } from '@/components/display/TickerBar'
import { DeparturesTable } from '@/components/display/DeparturesTable'
import { AdSlot } from '@/components/display/AdSlot'
import { StationDashboard } from '@/components/dashboard/station-dashboard'
import { TransporterDashboard } from '@/components/dashboard/transporter-dashboard'
import { MonetizationDashboard } from '@/components/dashboard/monetization-dashboard'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { CookieConsent } from '@/components/rgpd/cookie-consent'
import ApiDocumentation from '@/components/api-docs/api-documentation'
import ThemeCustomizer from '@/components/whitelist/theme-customizer'
import { DataPrivacyPanel } from '@/components/rgpd/data-privacy-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Monitor,
  MapPin,
  ArrowRight,
  Bus,
  Train,
  Ship,
  Wifi,
  WifiOff,
  Maximize,
  Minimize,
  LogIn,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  DollarSign,
  Zap,
  BarChart3,
  Store,
  Crown,
  QrCode,
  Clock,
  Users,
  Building2,
  Shield,
  Loader2,
  Globe,
  BookOpen,
  Palette,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

interface Station {
  id: string
  name: string
  code: string
  city: string
  country: string
  timezone: string
  _count: { lines: number; platforms: number }
}

type ViewMode = 'landing' | 'display' | 'dashboard'

// ============================================================
// Main Page Component
// ============================================================

export default function SmartTicketQRPage() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('landing')
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')

  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuthStore()

  // Kiosk mode for display view
  const kiosk = useKioskMode({
    blockShortcuts: false,
    preventZoom: false,
    disableContextMenu: false,
  })

  // Fetch stations
  const { data: stationsData, isLoading: stationsLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await fetch('/api/stations')
      if (!res.ok) throw new Error('Failed to fetch stations')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as Station[]
    },
    refetchInterval: 60000,
  })

  const stations: Station[] = stationsData || []

  // Handle login
  const handleLogin = useCallback(async () => {
    const success = await login(loginEmail)
    if (success) {
      setLoginOpen(false)
      setLoginEmail('')
      toast.success(`Bienvenue !`)
      // Determine dashboard type based on role
      if (user?.role === 'TRANSPORTER') {
        setViewMode('dashboard')
      } else {
        setViewMode('dashboard')
      }
    } else {
      toast.error('Email non reconnu. Essayez un des comptes démo.')
    }
  }, [login, loginEmail, user?.role])

  // Handle station selection
  const handleSelectStation = (station: Station) => {
    setSelectedStation(station)
    setViewMode('display')
  }

  const handleBackToLanding = () => {
    setViewMode('landing')
    setSelectedStation(null)
    if (kiosk.isEnabled) {
      kiosk.disable()
    }
  }

  const handleOpenDashboard = () => {
    if (!isAuthenticated) {
      setLoginOpen(true)
      return
    }
    setViewMode('dashboard')
  }

  const handleBackFromDashboard = () => {
    setViewMode('landing')
  }

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewMode === 'display') handleBackToLanding()
        else if (viewMode === 'dashboard') handleBackFromDashboard()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [viewMode])

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground ${kiosk.isEnabled ? 'kiosk-mode' : ''}`}>
      <AnimatePresence mode="wait">
        {viewMode === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col"
          >
            <LandingHeader
              isAuthenticated={isAuthenticated}
              user={user}
              onLoginClick={() => setLoginOpen(true)}
              onDashboardClick={handleOpenDashboard}
              onLogout={logout}
            />
            <main className="flex-1 px-4 md:px-8 lg:px-16 py-8">
              <StationSelector
                stations={stations}
                isLoading={stationsLoading}
                onSelect={handleSelectStation}
              />
            </main>
            <FeaturesSection />
            <LandingFooter />
          </motion.div>
        )}

        {viewMode === 'display' && selectedStation && (
          <motion.div
            key="display"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen flex flex-col"
          >
            <DisplayView
              station={selectedStation}
              onBack={handleBackToLanding}
              kiosk={kiosk}
            />
          </motion.div>
        )}

        {viewMode === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col"
          >
            <DashboardView
              user={user}
              stations={stations}
              onBack={handleBackFromDashboard}
              onLogout={logout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 4: PWA Install Prompt */}
      <InstallPrompt />

      {/* Phase 4: Cookie Consent Banner */}
      <CookieConsent />

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Connexion Admin
            </DialogTitle>
            <DialogDescription>
              Connectez-vous pour accéder au tableau de bord de gestion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@smartticketqr.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comptes démo
              </p>
              <div className="grid gap-1.5">
                {[
                  { email: 'admin@smartticketqr.com', role: 'Super Admin', color: 'text-red-400' },
                  { email: 'manager@dakar-station.sn', role: 'Gestionnaire', color: 'text-emerald-400' },
                  { email: 'thermes@transport.sn', role: 'Transporteur', color: 'text-sky-400' },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    onClick={() => setLoginEmail(demo.email)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-sm
                      bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className={`font-mono text-xs ${demo.color}`}>{demo.role}</span>
                    <span className="text-muted-foreground truncate">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={!loginEmail || authLoading}
              className="w-full"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Se connecter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Landing Header
// ============================================================

function LandingHeader({
  isAuthenticated,
  user,
  onLoginClick,
  onDashboardClick,
  onLogout,
}: {
  isAuthenticated: boolean
  user: { role: string; name: string; tenant: { name: string } | null } | null
  onLoginClick: () => void
  onDashboardClick: () => void
  onLogout: () => void
}) {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SmartTicketQR</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Affichage Dynamique Temps Réel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>En ligne</span>
          </div>

          <LanguageSwitcher />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs gap-1 ${getRoleColor(user.role as 'SUPERADMIN' | 'STATION_MANAGER' | 'TRANSPORTER' | 'MERCHANT' | 'TRAVELER')}`}>
                <Shield className="w-3 h-3" />
                {getRoleLabel(user.role as 'SUPERADMIN' | 'STATION_MANAGER' | 'TRANSPORTER' | 'MERCHANT' | 'TRAVELER')}
              </Badge>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={onDashboardClick}>
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground" onClick={onLogout}>
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={onLoginClick}>
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

// ============================================================
// Station Selector
// ============================================================

function StationSelector({
  stations,
  isLoading,
  onSelect,
}: {
  stations: Station[]
  isLoading: boolean
  onSelect: (station: Station) => void
}) {
  return (
    <section className="max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Vos Départs en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              Temps Réel
            </span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Sélectionnez votre gare pour voir les prochains départs, les informations en direct,
            et les services disponibles.
          </p>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {stations.map((station, index) => (
            <StationCard
              key={station.id}
              station={station}
              index={index}
              onSelect={() => onSelect(station)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function StationCard({ station, index, onSelect }: { station: Station; index: number; onSelect: () => void }) {
  const StationIcon = station.code === 'GMD' ? Ship : station.code === 'DKR' ? Bus : Train

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="group relative overflow-hidden rounded-2xl border bg-card p-6 text-left
        hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5
        transition-all duration-300 focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`Ouvrir l'affichage pour ${station.name}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <StationIcon className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-500 font-mono tracking-wider">{station.code}</span>
              <h3 className="text-base font-bold leading-tight">{station.name}</h3>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200" />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{station.city}, {station.country}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bus className="w-3.5 h-3.5" />
            <span><strong className="text-foreground">{station._count.lines}</strong> lignes</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span><strong className="text-foreground">{station._count.platforms}</strong> quais</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>En ligne</span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ============================================================
// Dashboard View (routes to Station or Transporter dashboard)
// ============================================================

function DashboardView({
  user,
  stations,
  onBack,
  onLogout,
}: {
  user: { id: string; role: string; name: string; tenant: { id: string; name: string; type: string; slug: string } | null } | null
  stations: Station[]
  onBack: () => void
  onLogout: () => void
}) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)
  const [dashboardTab, setDashboardTab] = useState<'manage' | 'monetization' | 'api-docs' | 'whitelist' | 'privacy'>('manage')

  const isSuperAdmin = user?.role === 'SUPERADMIN'
  const isTransporter = user?.role === 'TRANSPORTER'
  const isStationManager = user?.role === 'STATION_MANAGER' || user?.role === 'SUPERADMIN'

  const effectiveStationId = selectedStationId ?? (isStationManager && stations.length > 0 ? stations[0].id : null)

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="shrink-0 border-b bg-card px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 -ml-2 hover:bg-muted/50">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <LayoutDashboard className="w-4 h-4 text-emerald-500 shrink-0" />
                <h1 className="text-base font-bold truncate">
                  {isTransporter ? 'Dashboard Transporteur' : `Dashboard Gare`}
                </h1>
                <Badge variant="outline" className={`text-xs gap-1 shrink-0 ${getRoleColor(user.role as 'SUPERADMIN' | 'STATION_MANAGER' | 'TRANSPORTER' | 'MERCHANT' | 'TRAVELER')}`}>
                  {getRoleLabel(user.role as 'SUPERADMIN' | 'STATION_MANAGER' | 'TRANSPORTER' | 'MERCHANT' | 'TRAVELER')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.name} {user.tenant ? `· ${user.tenant.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switcher for SuperAdmin: Gestion vs Monétisation */}
            {isSuperAdmin && (
              <div className="hidden sm:flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <button onClick={() => setDashboardTab('manage')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboardTab === 'manage' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  <LayoutDashboard className="w-3 h-3" />
                  Gestion
                </button>
                <button onClick={() => setDashboardTab('monetization')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboardTab === 'monetization' ? 'bg-purple-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  <Crown className="w-3 h-3" />
                  Monétisation
                </button>
                <button onClick={() => setDashboardTab('api-docs')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboardTab === 'api-docs' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  <BookOpen className="w-3 h-3" />
                  <span className="hidden lg:inline">API</span>
                </button>
                <button onClick={() => setDashboardTab('whitelist')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboardTab === 'whitelist' ? 'bg-rose-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  <Palette className="w-3 h-3" />
                  <span className="hidden lg:inline">Marque</span>
                </button>
                <button onClick={() => setDashboardTab('privacy')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboardTab === 'privacy' ? 'bg-teal-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  <ShieldCheck className="w-3 h-3" />
                  <span className="hidden lg:inline">RGPD</span>
                </button>
              </div>
            )}
            {/* Station selector for station managers */}
            {isStationManager && stations.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                {stations.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStationId(s.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                      ${effectiveStationId === s.id
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={onLogout}>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile tab switcher for SuperAdmin */}
      {isSuperAdmin && (
        <div className="sm:hidden flex border-b bg-card px-4 gap-0 overflow-x-auto">
          <button onClick={() => setDashboardTab('manage')} className={`shrink-0 px-3 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${dashboardTab === 'manage' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-muted-foreground'}`}>
            <LayoutDashboard className="w-4 h-4 mx-auto mb-0.5" />
            Gestion
          </button>
          <button onClick={() => setDashboardTab('monetization')} className={`shrink-0 px-3 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${dashboardTab === 'monetization' ? 'border-purple-500 text-purple-400' : 'border-transparent text-muted-foreground'}`}>
            <Crown className="w-4 h-4 mx-auto mb-0.5" />
            Monét.
          </button>
          <button onClick={() => setDashboardTab('api-docs')} className={`shrink-0 px-3 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${dashboardTab === 'api-docs' ? 'border-sky-500 text-sky-400' : 'border-transparent text-muted-foreground'}`}>
            <BookOpen className="w-4 h-4 mx-auto mb-0.5" />
            API
          </button>
          <button onClick={() => setDashboardTab('whitelist')} className={`shrink-0 px-3 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${dashboardTab === 'whitelist' ? 'border-rose-500 text-rose-400' : 'border-transparent text-muted-foreground'}`}>
            <Palette className="w-4 h-4 mx-auto mb-0.5" />
            Marque
          </button>
          <button onClick={() => setDashboardTab('privacy')} className={`shrink-0 px-3 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${dashboardTab === 'privacy' ? 'border-teal-500 text-teal-400' : 'border-transparent text-muted-foreground'}`}>
            <ShieldCheck className="w-4 h-4 mx-auto mb-0.5" />
            RGPD
          </button>
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        {/* SuperAdmin: API Docs tab */}
        {isSuperAdmin && dashboardTab === 'api-docs' && effectiveStationId ? (
          <div className="p-4 md:p-6">
            <ApiDocumentation stationId={effectiveStationId} />
          </div>
        ) : isSuperAdmin && dashboardTab === 'whitelist' && effectiveStationId ? (
          <div className="p-4 md:p-6">
            <ThemeCustomizer tenantId={user.tenant?.id || user.id} stationName={stations.find((s) => s.id === effectiveStationId)?.name ?? ''} />
          </div>
        ) : isSuperAdmin && dashboardTab === 'privacy' ? (
          <div className="p-4 md:p-6">
            <DataPrivacyPanel userId={user.id} />
          </div>
        ) : isSuperAdmin && dashboardTab === 'monetization' && effectiveStationId ? (
          <MonetizationDashboard
            tenantId={user.tenant?.id || user.id}
            stationId={effectiveStationId}
            stationName={stations.find((s) => s.id === effectiveStationId)?.name ?? ''}
            userId={user.id}
          />
        ) : isTransporter ? (
          <TransporterDashboard
            transporterId={user.tenant?.id || user.id}
            transporterName={user.tenant?.name || user.name}
            stations={stations.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
          />
        ) : effectiveStationId ? (
          <StationDashboard
            stationId={effectiveStationId}
            stationName={stations.find((s) => s.id === effectiveStationId)?.name ?? ''}
            stationCode={stations.find((s) => s.id === effectiveStationId)?.code ?? ''}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Sélectionnez une gare</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ============================================================
// Features Section
// ============================================================

function FeaturesSection() {
  const features = [
    { icon: Clock, title: 'Temps Réel 30s', description: 'Mises à jour automatiques toutes les 30 secondes', color: 'text-emerald-500' },
    { icon: Zap, title: 'Alertes Retard', description: 'Notifications instantanées de changements', color: 'text-amber-500' },
    { icon: QrCode, title: 'QR Connect', description: 'Scannez pour recevoir les alertes sur mobile', color: 'text-sky-500' },
    { icon: BarChart3, title: 'Analytics', description: 'Données de fréquentation et performances', color: 'text-purple-500' },
    { icon: Store, title: 'Marketplace', description: 'Services et offres des commerces locaux', color: 'text-rose-500' },
    { icon: Users, title: 'Multi-Tenants', description: 'Isolation complète entre gares et transporteurs', color: 'text-teal-500' },
  ]

  return (
    <section className="border-t bg-card/30 px-4 md:px-8 lg:px-16 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-8">Une Plateforme Complète</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
              className="flex flex-col items-center text-center gap-2 p-4"
            >
              <feature.icon className={`w-8 h-8 ${feature.color}`} />
              <h3 className="text-sm font-bold">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Landing Footer
// ============================================================

function LandingFooter() {
  return (
    <footer className="border-t px-4 md:px-8 lg:px-16 py-6 bg-card/30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Monitor className="w-4 h-4 text-emerald-500" />
          <span>SmartTicketQR v2.0</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Plateforme d&apos;affichage dynamique pour gares routières et ferroviaires
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tous systèmes opérationnels</span>
        </div>
      </div>
    </footer>
  )
}

// ============================================================
// Display View (Station Board)
// ============================================================

function DisplayView({ station, onBack, kiosk }: { station: Station; onBack: () => void; kiosk: ReturnType<typeof useKioskMode> }) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setLastUpdate(new Date()) }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="shrink-0 border-b bg-card px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 -ml-2 hover:bg-muted/50" aria-label="Retour">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold truncate">{station.name}</h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400">
                  {station.code}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{station.city}, {station.country}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Connecté' : 'Hors ligne'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LiveClock timezone={station.timezone} className="hidden sm:flex" />
            <Button
              variant={kiosk.isEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={kiosk.toggle}
              className="text-xs gap-1.5"
              aria-label={kiosk.isEnabled ? 'Désactiver le mode kiosk' : 'Activer le mode kiosk'}
            >
              {kiosk.isEnabled ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Kiosk</span>
            </Button>
          </div>
        </div>
      </header>

      <TickerBar stationId={station.id} className="shrink-0" />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 p-4 md:p-6 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto display-scroll rounded-lg border bg-card">
            <DeparturesTable stationId={station.id} autoRefreshMs={30000} limit={50} />
          </div>
        </div>
        <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          <AdSlot variant="sidebar" />
          <AdSlot variant="sidebar" />
          <QRCodeSection stationId={station.id} stationCode={station.code} />
        </aside>
      </main>

      <div className="lg:hidden px-4 md:px-6 pb-3">
        <AdSlot variant="banner" />
      </div>

      <footer className="shrink-0 border-t bg-card/50 px-4 md:px-6 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-emerald-500" />
            <span>SmartTicketQR</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">{station.name}</span>
            <span className="tabular-nums">{lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ============================================================
// QR Code Section
// ============================================================

function QRCodeSection({ stationId, stationCode }: { stationId: string; stationCode: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function generateQR() {
      try {
        const QRCode = (await import('qrcode')).default
        const url = `${window.location.origin}/?station=${stationId}`
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200, margin: 1,
          color: { dark: '#10b981', light: '#00000000' },
          errorCorrectionLevel: 'M',
        })
        if (!cancelled) { setQrDataUrl(dataUrl); setIsLoading(false) }
      } catch {
        if (!cancelled) setIsLoading(false)
      }
    }
    generateQR()
    return () => { cancelled = true }
  }, [stationId])

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col items-center gap-3">
      <h3 className="text-sm font-bold flex items-center gap-1.5">
        <QrCode className="w-4 h-4 text-emerald-500" />
        Scan & Alertes
      </h3>
      {isLoading ? (
        <Skeleton className="w-40 h-40 rounded-lg" />
      ) : qrDataUrl ? (
        <img src={qrDataUrl} alt={`QR Code - Gare ${stationCode}`} className="w-40 h-40 rounded-lg" width={160} height={160} />
      ) : (
        <div className="w-40 h-40 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">QR indisponible</div>
      )}
      <p className="text-xs text-muted-foreground text-center">Scannez pour recevoir les alertes sur votre téléphone</p>
    </div>
  )
}
