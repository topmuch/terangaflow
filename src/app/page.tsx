'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import {
  Monitor,
  Bell,
  BarChart3,
  CreditCard,
  ArrowRight,
  Play,
  Check,
  Star,
  Zap,
  Globe,
  Users,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Layers,
  LayoutDashboard,
  DollarSign,
  QrCode,
  Bus,
  MapPin,
 LogIn,
  LogOut,
  Shield,
  Loader2,
  Route,
  AlertTriangle,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore, getRoleLabel, getRoleColor } from '@/lib/auth-store';

// ── Lazy-load heavy dashboard components ──
const StationDashboard = dynamic(
  () => import('@/components/dashboard/station-dashboard').then(m => ({ default: m.StationDashboard })),
  { ssr: false }
);
const TransporterDashboard = dynamic(
  () => import('@/components/dashboard/transporter-dashboard').then(m => ({ default: m.TransporterDashboard })),
  { ssr: false }
);
const MonetizationDashboard = dynamic(
  () => import('@/components/dashboard/monetization-dashboard').then(m => ({ default: m.MonetizationDashboard })),
  { ssr: false }
);
const DashboardSidebar = dynamic(
  () => import('@/components/dashboard/Sidebar').then(m => ({ default: m.Sidebar })),
  { ssr: false }
);
const ApiDocumentation = dynamic(
  () => import('@/components/api-docs/api-documentation'),
  { ssr: false }
);
const ThemeCustomizer = dynamic(
  () => import('@/components/whitelist/theme-customizer'),
  { ssr: false }
);
const DataPrivacyPanel = dynamic(
  () => import('@/components/rgpd/data-privacy-panel').then(m => ({ default: m.DataPrivacyPanel })),
  { ssr: false }
);
const MerchantRegisterForm = dynamic(
  () => import('@/components/dashboard/MerchantRegisterForm').then(m => ({ default: m.MerchantRegisterForm })),
  { ssr: false }
);
const MerchantDashboardComponent = dynamic(
  () => import('@/components/dashboard/merchant-dashboard').then(m => ({ default: m.MerchantDashboard })),
  { ssr: false }
);

/* ============================================================
   ANIMATION HELPERS
   ============================================================ */

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FadeIn({
  children,
  delay = 0,
  className = '',
  direction = 'up',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const x = direction === 'left' ? -30 : direction === 'right' ? 30 : 0;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: direction === 'up' ? 30 : 0, x }}
      animate={
        isInView
          ? { opacity: 1, y: 0, x: 0 }
          : { opacity: 0, y: direction === 'up' ? 30 : 0, x }
      }
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   FLOATING BACKGROUND SHAPES
   ============================================================ */

function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-cyan-500/5 blur-3xl animate-float" />
      <div className="absolute top-40 right-[15%] w-96 h-96 rounded-full bg-blue-500/5 blur-3xl animate-float-slow" />
      <div className="absolute bottom-20 left-[20%] w-80 h-80 rounded-full bg-violet-500/5 blur-3xl animate-float" />
      <div className="absolute bottom-40 right-[10%] w-64 h-64 rounded-full bg-orange-500/5 blur-3xl animate-float-slow" />
      {/* Geometric shapes */}
      <div className="absolute top-32 right-[25%] w-3 h-3 rounded-full bg-cyan-400/40 animate-pulse" />
      <div className="absolute top-48 left-[30%] w-2 h-2 rounded-full bg-violet-400/40 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-60 right-[35%] w-4 h-4 rounded-full bg-orange-400/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-64 left-[15%] w-2.5 h-2.5 rounded-full bg-blue-400/30 animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-32 left-[45%] w-2 h-2 rounded-full bg-pink-400/30 animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}

/* ============================================================
   1. NAVBAR
   ============================================================ */

const navLinks = [
  { label: 'Fonctionnalités', href: '#features' },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'Comment ça marche', href: '#how-it-works' },
  { label: 'Contact', href: '#cta-final' },
];

function Navbar({
  isAuthenticated,
  onLoginClick,
  onDashboardClick,
  onLogout,
}: {
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onDashboardClick: () => void;
  onLogout: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-strong shadow-lg shadow-black/20' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <button onClick={onDashboardClick} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl gradient-bg-animated flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
            <Bus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight gradient-text-primary">
            TerangaFlow
          </span>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA + Admin */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-white/15 text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/25 transition-all"
            onClick={onDashboardClick}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </Button>
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-slate-400 hover:text-white"
              onClick={onLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </Button>
          ) : (
            <Button
              className="gradient-bg-animated text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all border-0 hover:scale-[1.02]"
              onClick={onLoginClick}
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Admin
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 bg-[#0B0F19] border-white/10 p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="text-lg font-extrabold gradient-text-primary">TerangaFlow</span>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </Button>
              </SheetClose>
            </div>
            <div className="flex-1 flex flex-col p-4 gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="p-4 border-t border-white/10 space-y-2">
              <Button
                variant="outline"
                className="w-full border-white/15 text-slate-300 hover:text-white hover:bg-white/5"
                onClick={() => { onDashboardClick(); }}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button
                className="w-full gradient-bg-animated text-white font-semibold border-0"
                onClick={onLoginClick}
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      </nav>
    </header>
  );
}

/* ============================================================
   2. HERO SECTION
   ============================================================ */

function HeroSection({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <FloatingShapes />

      {/* Gradient overlay at top */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B0F19] pointer-events-none z-10" />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="text-center lg:text-left">
            <FadeUp>
              <Badge
                variant="outline"
                className="mb-6 px-4 py-1.5 text-xs font-semibold border-cyan-500/30 text-cyan-400 bg-cyan-500/5 backdrop-blur-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Nouveau : Marketplace locale intégrée
              </Badge>
            </FadeUp>

            <FadeUp delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
                L&apos;intelligence des gares,{' '}
                <span className="gradient-text-secondary">l&apos;hospitalité</span> en plus.
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Transformez vos écrans en sources de revenus avec l&apos;affichage temps réel, la
                marketplace locale et les notifications push.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={onTryDemo}
                  className="gradient-bg-animated text-white font-bold text-base px-8 py-6 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all border-0 hover:scale-[1.02] animate-pulse-glow"
                >
                  Démarrer l&apos;essai gratuit
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onTryDemo}
                  className="text-base px-8 py-6 font-semibold border-white/15 text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/25 transition-all bg-white/[0.02] backdrop-blur-sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Voir la démo live
                </Button>
              </div>
            </FadeUp>

            <FadeUp delay={0.4}>
              <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" />
                  <span>14 jours d&apos;essai</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" />
                  <span>Sans carte bancaire</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" />
                  <span>Setup en 5 min</span>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Right: Hero Mockup */}
          <FadeIn delay={0.2} direction="right" className="relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Glow behind mockup */}
              <div className="absolute -inset-4 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-violet-500/20 rounded-3xl blur-2xl" />

              {/* Mockup frame */}
              <div className="relative glass rounded-2xl p-1 shadow-2xl shadow-cyan-500/10">
                <div className="rounded-xl overflow-hidden bg-[#0F1629]">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-slate-400 font-mono">
                        terangaflow.app/dashboard
                      </div>
                    </div>
                  </div>

                  {/* Dashboard mockup content */}
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg gradient-bg-animated flex items-center justify-center">
                          <Bus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="h-3 w-24 bg-white/20 rounded" />
                          <div className="h-2 w-16 bg-white/10 rounded mt-1" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div className="h-2 w-14 bg-white/10 rounded" />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Départs', value: '142', color: 'from-cyan-500/20 to-cyan-500/5' },
                        { label: 'En retard', value: '3', color: 'from-orange-500/20 to-orange-500/5' },
                        { label: 'Revenus', value: '€2.4k', color: 'from-violet-500/20 to-violet-500/5' },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className={`rounded-lg bg-gradient-to-b ${stat.color} p-3 border border-white/5`}
                        >
                          <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                          <div className="text-lg font-bold text-white">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Table mockup */}
                    <div className="rounded-lg border border-white/5 overflow-hidden">
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-white/5 text-xs text-slate-400 font-semibold">
                        <span>Départ</span>
                        <span>Destination</span>
                        <span>Quai</span>
                        <span className="text-right">Statut</span>
                      </div>
                      {[
                        { time: '08:30', dest: 'Thiès', gate: 'A3', status: 'À l\'heure', statusColor: 'bg-emerald-500/20 text-emerald-400' },
                        { time: '08:45', dest: 'Saint-Louis', gate: 'B1', status: 'Retard 5min', statusColor: 'bg-orange-500/20 text-orange-400' },
                        { time: '09:00', dest: 'Kaolack', gate: 'A1', status: 'À l\'heure', statusColor: 'bg-emerald-500/20 text-emerald-400' },
                        { time: '09:15', dest: 'Ziguinchor', gate: 'C2', status: 'À l\'heure', statusColor: 'bg-emerald-500/20 text-emerald-400' },
                      ].map((row, i) => (
                        <div key={i} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs border-t border-white/5">
                          <span className="font-mono font-semibold text-white">{row.time}</span>
                          <span className="text-slate-300">{row.dest}</span>
                          <span className="text-slate-400">{row.gate}</span>
                          <span className={`text-right px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.statusColor}`}>
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg shadow-cyan-500/10"
              >
                <Bell className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-white">+847 push envoyés</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-4 glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg shadow-violet-500/10"
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">+340% revenus pub</span>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   3. SOCIAL PROOF
   ============================================================ */

const transportCompanies = [
  'Dakar Dem Dikk',
  'Sotrac',
  'Ndiaga Ndiaye',
  'Bintou Express',
  'Sénégal Voyages',
  'Thiès Transport',
];

function SocialProof() {
  return (
    <section className="relative py-16 sm:py-20 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <p className="text-center text-sm text-slate-500 font-medium uppercase tracking-widest mb-10">
            Ils nous font déjà confiance
          </p>
        </FadeUp>
        <FadeUp delay={0.15}>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
            {transportCompanies.map((company, i) => (
              <div
                key={company}
                className="group flex items-center gap-2 text-slate-500 hover:text-slate-200 transition-all duration-300 cursor-default"
              >
                <Bus className="w-5 h-5 opacity-40 group-hover:opacity-80 group-hover:text-cyan-400 transition-all" />
                <span className="text-sm sm:text-base font-semibold tracking-wide opacity-50 group-hover:opacity-100 transition-opacity">
                  {company}
                </span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ============================================================
   4. FEATURES GRID
   ============================================================ */

const features = [
  {
    icon: Monitor,
    title: 'Affichage Kiosk Temps Réel',
    description:
      'Écrans de départ dynamiques avec actualisation automatique toutes les 30 secondes. Affichez les horaires, quais, statuts et alertes.',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: QrCode,
    title: 'Marketplace & QR Codes',
    description:
      'Connectez les commerces locaux à vos voyageurs. Scannez un QR code pour accéder aux offres et services disponibles à la gare.',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-400',
  },
  {
    icon: Bell,
    title: 'Push Notifications Voyageurs',
    description:
      'Alertez vos voyageurs en temps réel : départs, retards, changements de quai. Engagement accru et satisfaction client.',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Data Premium',
    description:
      'Tableaux de bord complets : fréquentation, flux voyageurs, taux de remplissage, performance par ligne et par créneau.',
    color: 'blue',
    gradient: 'from-blue-500 to-sky-400',
  },
  {
    icon: Layers,
    title: 'White Label & Domaines Custom',
    description:
      'Personnalisez l\'interface avec votre branding : logo, couleurs, nom de domaine. Chaque gare a sa propre identité.',
    color: 'pink',
    gradient: 'from-pink-500 to-rose-400',
  },
  {
    icon: CreditCard,
    title: 'Monétisation Automatisée',
    description:
      'Revenus publicitaires intégrés via Stripe. Facturation automatique, statistiques pub, et partage de revenus simplifié.',
    color: 'amber',
    gradient: 'from-amber-400 to-yellow-400',
  },
];

function colorMap(color: string) {
  const map: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'group-hover:border-cyan-500/30',
      shadow: 'group-hover:shadow-cyan-500/10',
    },
    orange: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'group-hover:border-orange-500/30',
      shadow: 'group-hover:shadow-orange-500/10',
    },
    violet: {
      bg: 'bg-violet-500/10',
      text: 'text-violet-400',
      border: 'group-hover:border-violet-500/30',
      shadow: 'group-hover:shadow-violet-500/10',
    },
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'group-hover:border-blue-500/30',
      shadow: 'group-hover:shadow-blue-500/10',
    },
    pink: {
      bg: 'bg-pink-500/10',
      text: 'text-pink-400',
      border: 'group-hover:border-pink-500/30',
      shadow: 'group-hover:shadow-pink-500/10',
    },
    amber: {
      bg: 'bg-amber-400/10',
      text: 'text-amber-400',
      border: 'group-hover:border-amber-400/30',
      shadow: 'group-hover:shadow-amber-400/10',
    },
  };
  return map[color] || map.cyan;
}

function FeaturesSection() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-14">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-semibold border-violet-500/30 text-violet-400 bg-violet-500/5">
            <Zap className="w-3 h-3 mr-1" />
            Fonctionnalités
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Tout ce qu&apos;il faut pour{' '}
            <span className="gradient-text-primary">moderniser votre gare</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Une plateforme complète qui transforme chaque écran en centre de revenus et chaque voyageur en client satisfait.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((feature, i) => {
            const cm = colorMap(feature.color);
            return (
              <FadeUp key={feature.title} delay={i * 0.08}>
                <div
                  className={`group relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] transition-all duration-300 hover:shadow-xl ${cm.shadow} ${cm.border}`}
                >
                  {/* Gradient accent line */}
                  <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-50 transition-opacity`} />

                  <div className={`w-12 h-12 rounded-xl ${cm.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 ${cm.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </FadeUp>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   5. HOW IT WORKS
   ============================================================ */

const steps = [
  {
    number: '01',
    icon: Monitor,
    title: 'Installez l\'écran',
    description:
      'Utilisez un écran existant (TV, moniteur) ou installez-en un nouveau. Notre PWA s\'adapte à tout format et tout appareil.',
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
  },
  {
    number: '02',
    icon: Layers,
    title: 'Connectez vos lignes & commerces',
    description:
      'Importez vos horaires en CSV, ajoutez vos transporteurs et connectez les commerces locaux à la marketplace en quelques clics.',
    color: 'from-violet-500 to-pink-500',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-400',
  },
  {
    number: '03',
    icon: DollarSign,
    title: 'Encaissez les revenus',
    description:
      'Activez la monétisation publicitaire et suivez vos revenus en temps réel. Facturation automatique via Stripe, paiements sécurisés.',
    color: 'from-orange-500 to-amber-400',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 border-y border-white/5">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] via-transparent to-orange-500/[0.02] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-14">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-semibold border-cyan-500/30 text-cyan-400 bg-cyan-500/5">
            <Globe className="w-3 h-3 mr-1" />
            Comment ça marche
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Opérationnel en{' '}
            <span className="gradient-text-secondary">3 étapes</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Du premier écran aux premiers revenus, tout est automatisé.
          </p>
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <FadeUp key={step.number} delay={i * 0.15}>
              <div className="relative text-center md:text-left">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-gradient-to-r from-white/10 to-white/5" />
                )}

                {/* Step number + icon */}
                <div className="flex items-center gap-4 justify-center md:justify-start mb-5">
                  <div className={`w-14 h-14 rounded-2xl ${step.bgColor} flex items-center justify-center relative`}>
                    <step.icon className={`w-6 h-6 ${step.textColor}`} />
                    <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-[10px] font-bold text-white shadow-lg`}>
                      {step.number}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto md:mx-0">
                  {step.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   6. PRICING CARDS
   ============================================================ */

const plans = [
  {
    name: 'Starter',
    price: '29',
    period: '/mois',
    description: 'Idéal pour les petites gares et points de départ.',
    features: [
      '1 écran d\'affichage',
      'Jusqu\'à 5 lignes',
      'Mises à jour temps réel',
      'Push notifications (500/jour)',
      'Support email',
    ],
    cta: 'Choisir ce plan',
    popular: false,
    gradient: 'from-slate-600 to-slate-700',
  },
  {
    name: 'Pro',
    price: '79',
    period: '/mois',
    description: 'Pour les gares moyennes et hubs de transport.',
    features: [
      'Jusqu\'à 5 écrans',
      'Lignes illimitées',
      'Marketplace & QR Codes',
      'Analytics premium',
      'Push notifications (illimité)',
      'White label basique',
      'Support prioritaire',
    ],
    cta: 'Choisir ce plan',
    popular: true,
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    name: 'Enterprise',
    price: 'Sur mesure',
    period: '',
    description: 'Pour les réseaux nationaux et les grandes gares.',
    features: [
      'Écrans illimités',
      'Toutes les fonctionnalités Pro',
      'Domaine custom + SSL',
      'API complète',
      'Monétisation Stripe avancée',
      'SLA garanti 99.9%',
      'Account manager dédié',
    ],
    cta: 'Nous contacter',
    popular: false,
    gradient: 'from-violet-500 to-pink-500',
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-14">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-semibold border-orange-500/30 text-orange-400 bg-orange-500/5">
            <CreditCard className="w-3 h-3 mr-1" />
            Tarifs transparents
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Investissez dans{' '}
            <span className="gradient-text-accent">votre croissance</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Des tarifs adaptés à la taille de votre réseau. ROI positif dès le premier mois.
          </p>
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <FadeUp key={plan.name} delay={i * 0.12}>
              <div
                className={`relative rounded-2xl p-6 sm:p-8 flex flex-col ${
                  plan.popular
                    ? 'pricing-border-animated bg-white/[0.04] shadow-2xl shadow-cyan-500/10'
                    : 'border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]'
                } transition-all duration-300`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-bg-animated text-white text-xs font-bold px-4 py-1 border-0 shadow-lg shadow-cyan-500/30">
                      <Star className="w-3 h-3 mr-1" />
                      Le plus populaire
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-400">{plan.description}</p>
                </div>

                <div className="mb-6">
                  {plan.price === 'Sur mesure' ? (
                    <span className="text-3xl font-extrabold text-white">Sur mesure</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white">{plan.price}€</span>
                      <span className="text-slate-400 text-sm mb-2">{plan.period}</span>
                    </div>
                  )}
                </div>

                <a href="#cta-final" className="block mb-6">
                  <Button
                    className={`w-full font-semibold py-5 border-0 transition-all hover:scale-[1.02] ${
                      plan.popular
                        ? 'gradient-bg-animated text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>

                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   7. TESTIMONIALS
   ============================================================ */

function TestimonialsSection() {
  return (
    <section className="relative py-20 sm:py-28 border-y border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] via-transparent to-cyan-500/[0.03] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp className="text-center mb-14">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-semibold border-pink-500/30 text-pink-400 bg-pink-500/5">
            <Users className="w-3 h-3 mr-1" />
            Témoignages
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Ils ont{' '}
            <span className="gradient-text-secondary">transformé leurs gares</span>
          </h2>
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {[
            {
              quote:
                "Depuis TerangaFlow, nos voyageurs savent exactement quand partir. Les réclamations ont baissé de 60% et nos revenus publicitaires ont triplé en 3 mois.",
              name: 'Mamadou Diop',
              role: 'Directeur, Gare de Dakar',
              stats: '+340% revenus pub',
              color: 'cyan',
            },
            {
              quote:
                "L'intégration de la marketplace a permis à nos commerçants locaux de toucher 2 000 voyageurs supplémentaires par jour. Un vrai écosystème.",
              name: 'Aissatou Fall',
              role: 'Responsable Commerce, Gare Thiès',
              stats: '+2 000 clients/jour',
              color: 'orange',
            },
            {
              quote:
                "Le mode kiosk est incroyablement stable. Nous faisons tourner 12 écrans 24/7 sans aucune interruption. Le support est réactif et professionnel.",
              name: 'Ibrahima Ndiaye',
              role: 'CTO, Sénégal Voyages',
              stats: '12 écrans 24/7',
              color: 'violet',
            },
          ].map((testimonial, i) => (
            <FadeUp key={testimonial.name} delay={i * 0.12}>
              <div className="relative rounded-2xl p-6 border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] transition-all duration-300 group">
                {/* Quote icon */}
                <div className="absolute top-4 right-4 text-6xl font-serif text-white/5 leading-none select-none">
                  &ldquo;
                </div>

                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mb-6 relative z-10">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <div className="text-sm font-bold text-white">{testimonial.name}</div>
                    <div className="text-xs text-slate-500">{testimonial.role}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold px-3 py-1 border-0 ${
                      testimonial.color === 'cyan'
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : testimonial.color === 'orange'
                          ? 'bg-orange-500/10 text-orange-400'
                          : 'bg-violet-500/10 text-violet-400'
                    }`}
                  >
                    {testimonial.stats}
                  </Badge>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Stats band */}
        <FadeUp delay={0.4}>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '150+', label: 'Gares connectées' },
              { value: '2M+', label: 'Voyageurs/mois' },
              { value: '99.9%', label: 'Disponibilité' },
              { value: '340%', label: 'ROI moyen' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold gradient-text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ============================================================
   8. CTA FINAL
   ============================================================ */

function CtaFinalSection() {
  return (
    <section id="cta-final" className="relative py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 gradient-bg-animated opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19]/80 via-transparent to-[#0B0F19]/80" />

            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            <div className="relative z-10 px-6 sm:px-12 lg:px-20 py-14 sm:py-20 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
                Prêt à moderniser votre gare ?
              </h2>
              <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto mb-6">
                Rejoignez les 150+ gares qui font confiance à TerangaFlow. Essai gratuit de 14 jours, sans engagement.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 h-12 rounded-xl px-4"
                />
                <Button className="bg-white text-slate-900 font-bold h-12 px-6 rounded-xl hover:bg-white/90 transition-colors shadow-lg shrink-0">
                  Commencer
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Merchant CTA */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-white/50 mb-3">Vous êtes commerçant ?</p>
                <Button
                  onClick={() => setViewMode('merchant-register')}
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-semibold"
                >
                  <Store className="w-4 h-4 mr-2" />
                  Inscrivez votre commerce à la gare
                </Button>
              </div>

              <p className="text-xs text-white/40 mt-4">
                Gratuit pendant 14 jours. Aucune carte bancaire requise.
              </p>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ============================================================
   9. FOOTER
   ============================================================ */

const footerLinks = {
  Produit: ['Fonctionnalités', 'Tarifs', 'Démo live', 'API Docs', 'Changelog'],
  Entreprise: ['À propos', 'Blog', 'Carrières', 'Partenaires', 'Presse'],
  Ressources: ['Documentation', 'Tutoriels', 'Webinaires', 'Communauté', 'Statut'],
  Légal: ['Confidentialité', 'CGU', 'RGPD', 'Cookies', 'Mentions légales'],
};

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#080C14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-bg-animated flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold gradient-text-primary">TerangaFlow</span>
            </a>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              L&apos;hospitalité rencontre la mobilité.
            </p>
            <div className="flex gap-3">
              {['X', 'Li', 'Gh'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-400 hover:text-white transition-colors font-bold"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-slate-500 hover:text-slate-200 transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            &copy; 2026 TerangaFlow — L&apos;hospitalité rencontre la mobilité
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Dakar, Sénégal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Afrique & Marchés émergents</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

// ============================================================
//   TYPES
// ============================================================

type ViewMode = 'landing' | 'dashboard' | 'merchant-register' | 'merchant-dashboard';

interface Station {
  id: string
  name: string
  code: string
  city: string
  country: string
  timezone: string
  _count: { lines: number; platforms: number }
}

// ============================================================
//   LOGIN DIALOG
// ============================================================

function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    const success = await login(email);
    if (success) {
      setEmail('');
      onOpenChange(false);
      toast.success('Bienvenue !');
    } else {
      toast.error('Email non reconnu. Essayez un des comptes démo.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5 text-cyan-400" />
            Connexion Admin
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Connectez-vous pour accéder au tableau de bord de gestion.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@smartticketqr.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Comptes démo
            </p>
            <div className="grid gap-1.5">
              {[
                { email: 'admin@smartticketqr.com', role: 'Super Admin', color: 'text-red-400' },
                { email: 'manager@dakar-station.sn', role: 'Gestionnaire', color: 'text-cyan-400' },
                { email: 'thermes@transport.sn', role: 'Transporteur', color: 'text-orange-400' },
              ].map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => setEmail(demo.email)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm
                    bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <span className={`font-mono text-xs font-bold ${demo.color}`}>{demo.role}</span>
                  <span className="text-slate-500 truncate text-xs">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleLogin}
            disabled={!email || isLoading}
            className="w-full gradient-bg-animated text-white font-semibold border-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            Se connecter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
//   DASHBOARD VIEW
// ============================================================

function DashboardView({
  user,
  stations,
  onBack,
  onLogout,
}: {
  user: { id: string; role: string; name: string; tenant: { id: string; name: string; type: string; slug: string } | null } | null;
  stations: Station[];
  onBack: () => void;
  onLogout: () => void;
}) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isTransporter = user?.role === 'TRANSPORTER';
  const isStationManager = user?.role === 'STATION_MANAGER' || user?.role === 'SUPERADMIN';

  const effectiveStationId = selectedStationId ?? (isStationManager && stations.length > 0 ? stations[0].id : null);

  if (!user) return null;

  // Map sidebar tabs to StationDashboard internal tabs
  const sidebarToStationTab: Record<string, string> = {
    overview: 'overview',
    lines: 'lines',
    trips: 'schedules',
    schedules: 'schedules',
    settings: 'overview',
    push: 'push',
    billing: 'billing',
    whitelabel: 'whitelabel',
  };
  const stationInitialTab = sidebarToStationTab[sidebarTab] || 'overview';

  const showMonetization = sidebarTab === 'monetization';
  const showApiDocs = sidebarTab === 'api-docs';
  const showWhitelist = sidebarTab === 'whitelist';
  const showPrivacy = sidebarTab === 'privacy';
  const showStationManage = !showMonetization && !showApiDocs && !showWhitelist && !showPrivacy;

  return (
    <div className="h-screen flex bg-[#0B0F19] overflow-hidden">
      <DashboardSidebar
        user={user}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
        onLogout={onLogout}
        onBack={onBack}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto bg-[#0B0F19]">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-sm px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">
              {sidebarTab === 'overview' && "Vue d'ensemble"}
              {sidebarTab === 'lines' && 'Gestion des Lignes'}
              {sidebarTab === 'trips' && 'Départs / Arrivées'}
              {sidebarTab === 'schedules' && 'Horaires'}
              {sidebarTab === 'settings' && 'Paramètres'}
              {sidebarTab === 'monetization' && 'Monétisation'}
              {sidebarTab === 'api-docs' && 'Documentation API'}
              {sidebarTab === 'whitelist' && 'White Label'}
              {sidebarTab === 'privacy' && 'RGPD & Confidentialité'}
              {sidebarTab === 'push' && 'Notifications Push'}
              {sidebarTab === 'billing' && 'Abonnements & Facturation'}
              {sidebarTab === 'whitelabel' && 'Marque Blanche'}
            </h1>
            <Badge variant="outline" className={`text-xs gap-1 shrink-0 border-white/10 ${getRoleColor(user.role as 'SUPERADMIN' | 'STATION_MANAGER' | 'TRANSPORTER' | 'MERCHANT' | 'TRAVELER')}`}>
              {getRoleLabel(user.role as 'SUPERADMIN' | 'STATION_MANAGER' | 'TRANSPORTER' | 'MERCHANT' | 'TRAVELER')}
            </Badge>
          </div>
          {isStationManager && (
            <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {stations.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStationId(s.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    effectiveStationId === s.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s.code}
                </button>
              ))}
            </div>
          )}
        </header>
        <div className="p-4 md:p-6">
          {sidebarTab === 'overview' && showStationManage && effectiveStationId && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Lignes Actives" value={stations.find(s => s.id === effectiveStationId)?._count.lines ?? 0} icon={Route} color="cyan" subtitle="En service" />
                <StatCard title="Départs Aujourd'hui" value={12} icon={Bus} color="cyan" subtitle="Sur 145 prévus" />
                <StatCard title="Retards en cours" value={3} icon={AlertTriangle} color="red" subtitle="Moy: 8 min" />
                <StatCard title="Délai Moyen" value="8 min" icon={TrendingUp} color="amber" subtitle="Amélioration -2min" />
              </div>
              {isTransporter ? (
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
                  initialTab={stationInitialTab}
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-500">Sélectionnez une gare</div>
              )}
            </div>
          )}
          {(sidebarTab === 'lines' || sidebarTab === 'trips' || sidebarTab === 'schedules' || sidebarTab === 'settings' || sidebarTab === 'push' || sidebarTab === 'billing' || sidebarTab === 'whitelabel') && effectiveStationId && (
            <StationDashboard
              stationId={effectiveStationId}
              stationName={stations.find((s) => s.id === effectiveStationId)?.name ?? ''}
              stationCode={stations.find((s) => s.id === effectiveStationId)?.code ?? ''}
              initialTab={stationInitialTab}
            />
          )}
          {isSuperAdmin && showMonetization && effectiveStationId && (
            <MonetizationDashboard
              tenantId={user.tenant?.id || user.id}
              stationId={effectiveStationId}
              stationName={stations.find((s) => s.id === effectiveStationId)?.name ?? ''}
              userId={user.id}
            />
          )}
          {isSuperAdmin && showApiDocs && effectiveStationId && (
            <ApiDocumentation stationId={effectiveStationId} />
          )}
          {isSuperAdmin && showWhitelist && effectiveStationId && (
            <ThemeCustomizer tenantId={user.tenant?.id || user.id} stationName={stations.find((s) => s.id === effectiveStationId)?.name ?? ''} />
          )}
          {isSuperAdmin && showPrivacy && (
            <DataPrivacyPanel userId={user.id} />
          )}
          {isTransporter && showStationManage && (
            <TransporterDashboard
              transporterId={user.tenant?.id || user.id}
              transporterName={user.tenant?.name || user.name}
              stations={stations.map((s) => ({ id: s.id, name: s.name, code: s.code }))}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================
//   STAT CARD (for dashboard)
// ============================================================

function StatCard({ title, value, icon: Icon, color, subtitle }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string; subtitle?: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  const cls = colorClasses[color] || colorClasses.cyan;
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// ============================================================
//   MAIN PAGE
// ============================================================

export default function TerangaFlowPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [loginOpen, setLoginOpen] = useState(false);
  const [merchantDashboardData, setMerchantDashboardData] = useState<{ merchantId: string; stationId: string; stationName: string; merchantName: string } | null>(null);

  const { user, isAuthenticated, logout } = useAuthStore();

  const { data: stationsData } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await fetch('/api/stations');
      if (!res.ok) throw new Error('Failed to fetch stations');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as Station[];
    },
    refetchInterval: 60000,
  });
  const stations: Station[] = stationsData || [];

  const handleOpenDashboard = useCallback(() => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    setViewMode('dashboard');
  }, [isAuthenticated]);

  const handleLogout = useCallback(() => {
    logout();
    setViewMode('landing');
    toast.info('Déconnecté');
  }, [logout]);

  const handleBackToLanding = useCallback(() => {
    setViewMode('landing');
  }, []);

  // Auto-redirect to dashboard if already logged in and tries to open dashboard
  useEffect(() => {
 if (isAuthenticated && viewMode === 'landing') {
   // Stay on landing - user can navigate via buttons
  }
  }, [isAuthenticated, viewMode]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-[#F8FAFC] overflow-x-hidden">
      <AnimatePresence mode="wait">
        {viewMode === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col"
          >
            <Navbar
              isAuthenticated={isAuthenticated}
              onLoginClick={() => setLoginOpen(true)}
              onDashboardClick={handleOpenDashboard}
              onLogout={handleLogout}
            />
            <main className="flex-1">
              <HeroSection onTryDemo={handleOpenDashboard} />
              <SocialProof />
              <FeaturesSection />
              <HowItWorksSection />
              <PricingSection />
              <TestimonialsSection />
              <CtaFinalSection />
            </main>
            <Footer />
          </motion.div>
        )}

        {viewMode === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            <DashboardView
              user={user}
              stations={stations}
              onBack={handleBackToLanding}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {viewMode === 'merchant-register' && (
          <motion.div
            key="merchant-register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen bg-[#0B0F19]"
          >
            <MerchantRegisterForm
              standalone
              onComplete={(merchantId) => {
                toast.success('Bienvenue ! Votre compte marchand a été créé.');
                if (stations.length > 0) {
                  setMerchantDashboardData({
                    merchantId,
                    stationId: stations[0].id,
                    stationName: stations[0].name,
                    merchantName: '',
                  });
                  setViewMode('merchant-dashboard');
                } else {
                  setViewMode('landing');
                }
              }}
              onBack={handleBackToLanding}
            />
          </motion.div>
        )}

        {viewMode === 'merchant-dashboard' && merchantDashboardData && (
          <motion.div
            key="merchant-dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            <MerchantDashboardComponent
              merchantId={merchantDashboardData.merchantId}
              merchantName={merchantDashboardData.merchantName}
              stationId={merchantDashboardData.stationId}
              stationName={merchantDashboardData.stationName}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
