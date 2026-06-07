"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Bus,
  Monitor,
  Bell,
  Megaphone,
  Users,
  CreditCard,
  Shield,
  Zap,
  Globe,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Feature icons ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Monitor,
    title: "Kiosque Temps Réel",
    description:
      "Affichage dynamique des départs avec polling 30s, wake-lock et mode plein écran.",
  },
  {
    icon: Bell,
    title: "Notifications Intelligentes",
    description:
      "Annonces vocales Ding-Dong+TTS, push notifications, WhatsApp/SMS.",
  },
  {
    icon: Megaphone,
    title: "Publicité Localisée",
    description:
      "AdEngine avec rotation automatique, tracking CPM/CPC et facturation automatisée.",
  },
  {
    icon: Users,
    title: "Marketplace Partenaires",
    description:
      "Profils marchands, QR interactifs, landing mobile et statistiques détaillées.",
  },
  {
    icon: Smartphone,
    title: "PWA Voyageurs",
    description:
      "Opt-in push, cache offline, pull-to-refresh pour les zones à connexion intermittente.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Sécurisé",
    description:
      "Isolation complète par tenant, RBAC fin, et conformité enterprise.",
  },
];

const STATS = [
  { value: "500+", label: "Gares connectées" },
  { value: "2M+", label: "Voyageurs informés/mois" },
  { value: "99.9%", label: "Disponibilité" },
  { value: "15+", label: "Pays couverts" },
];

const TRUST_POINTS = [
  "Mobile-first, adapté aux réalités locales",
  "Connexion intermittente supportée",
  "Paiements mobiles intégrés",
  "Interface simple et accessible",
  "Déploiement rapide en moins de 24h",
  "Support 24/7 en français",
];

// ─── Hero Counter Animation ──────────────────────────────────────────────────

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const [displayValue, setDisplayValue] = useState("0");

  // Use useEffect for the subscribe pattern
  rounded.on("change", (v) => {
    setDisplayValue(`${v}${suffix}`);
  });

  return (
    <span
      ref={(node) => {
        if (node) {
          animate(count, target, {
            duration: 2,
            ease: "easeOut",
          });
        }
      }}
      className="text-3xl md:text-4xl font-bold"
    >
      {displayValue}
    </span>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Bus className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">TerangaFlow</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Chiffres
            </a>
            <a href="#trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Avantages
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <Link href="/login">
                Essai gratuit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu de navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </nav>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t bg-background px-4 py-4 space-y-3"
          >
            <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Fonctionnalités
            </a>
            <a href="#stats" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Chiffres
            </a>
            <a href="#trust" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Avantages
            </a>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href="/login">Connexion</Link>
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link href="/login">Essai gratuit</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" aria-hidden="true" />
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-10 right-1/4 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="secondary" className="mb-6 px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Nouveau : Annonces vocales TTS en Wolof & Français
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              L&apos;intelligence des gares,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                l&apos;hospitalité en plus.
              </span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              TerangaFlow transforme les écrans de gare statiques en centres de communication
              temps réel, de monétisation locale et de data intelligente — adapté aux
              réalités de l&apos;Afrique francophone.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="h-12 px-8 text-base gap-2" asChild>
                <Link href="/login">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                <a href="#features">Découvrir</a>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Essai gratuit 14 jours • Sans carte bancaire • Déploiement en 24h
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tout ce dont votre gare a besoin
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Une suite complète de modules conçus pour les gares routières et ferroviaires d&apos;Afrique francophone.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full transition-shadow hover:shadow-lg hover:shadow-amber-500/5 border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ────────────────────────────────────────────────── */}
      <section id="stats" className="py-16 sm:py-20 border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STATS.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-amber-600 dark:text-amber-400">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / Advantages ────────────────────────────────────────────── */}
      <section id="trust" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Conçu pour l&apos;Afrique,
                <br />
                pensé pour chaque gare
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                TerangaFlow comprend les défis uniques des transports en Afrique :
                connexions intermittentes, paiements mobiles, et besoins d&apos;accessibilité.
              </p>

              <div className="mt-8 space-y-4">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{point}</span>
                  </div>
                ))}
              </div>

              <Button className="mt-8 gap-2" asChild>
                <Link href="/login">
                  Démarrer l&apos;essai gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 p-6 lg:p-8 shadow-xl">
                {/* Kiosk mockup */}
                <div className="rounded-xl bg-background border shadow-lg overflow-hidden">
                  <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 border-b">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono ml-2">
                      kiosk.terangaflow.app
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bus className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-bold">DÉPARTS EN DIRECT</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">14:32:05</span>
                    </div>
                    {[
                      { dest: "Saint-Louis", time: "08:30", status: "À l'heure" },
                      { dest: "Thiès", time: "09:00", status: "Retard" },
                      { dest: "Kaolack", time: "09:15", status: "À l'heure" },
                    ].map((dep) => (
                      <div
                        key={dep.dest}
                        className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                      >
                        <span className="text-xs font-medium">Dakar → {dep.dest}</span>
                        <span className="text-xs font-mono">{dep.time}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            dep.status === "À l'heure"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          }`}
                        >
                          {dep.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 rounded-lg bg-amber-500 text-white px-3 py-1.5 shadow-lg shadow-amber-500/25 text-xs font-bold">
                  LIVE
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-amber-500 to-orange-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white tracking-tight sm:text-4xl">
              Prêt à transformer votre gare ?
            </h2>
            <p className="mt-4 text-amber-100 max-w-xl mx-auto">
              Rejoignez des centaines de gares qui font déjà confiance à TerangaFlow
              pour gérer leurs opérations en temps réel.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="h-12 px-8 text-base bg-white text-amber-600 hover:bg-white/90 shadow-lg"
                asChild
              >
                <Link href="/login">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base border-white/30 text-white hover:bg-white/10"
              >
                <Globe className="h-4 w-4 mr-2" />
                Demander une démo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Bus className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold">TerangaFlow</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} TerangaFlow — L&apos;hospitalité en plus.
              Tous droits réservés.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Mentions légales
              </a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Confidentialité
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
