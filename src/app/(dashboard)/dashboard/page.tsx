"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import {
  Bus,
  Clock,
  MapPin,
  TrendingUp,
  Users,
  Monitor,
  ArrowUpRight,
  Activity,
  Volume2,
} from "lucide-react";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;

// ─── Gradient Stat Card ─────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, description, icon: Icon, gradient, trend, trendUp }: StatCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <div className={cn("rounded-xl p-5 text-white shadow-lg", gradient)}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white/80">{title}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">{value}</div>
          {trend && (
            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", trendUp ? "bg-white/20 text-white" : "bg-white/20 text-white")}>
              {trendUp ? <ArrowUpRight className="h-3 w-3 inline mr-0.5" /> : null}
              {trend}
            </span>
          )}
        </div>
        <p className="text-xs text-white/70 mt-1">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Recent Departures mock ───────────────────────────────────────────────────

const MOCK_DEPARTURES = [
  { line: "Dakar → Saint-Louis", operator: "Diaspora Bus", time: "08:30", platform: "A3", status: "À l'heure" },
  { line: "Dakar → Thiès", operator: "SATAS", time: "09:00", platform: "B1", status: "Retard 15min" },
  { line: "Dakar → Kaolack", operator: "SOTRAL", time: "09:15", platform: "A1", status: "À l'heure" },
  { line: "Dakar → Ziguinchor", operator: "Le Transporteur", time: "09:45", platform: "B2", status: "Complet" },
  { line: "Dakar → Tambacounda", operator: "CSC Kaloum", time: "10:00", platform: "A2", status: "À l'heure" },
];

// ─── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  if (status === "loading") return null;

  const userName = session?.user?.name ?? "Manager";
  const userRole = session?.user?.role ?? "STATION_MANAGER";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Bienvenue, {userName} 👋
        </h2>
        <p className="text-muted-foreground">
          Voici un aperçu de l&apos;activité de votre gare aujourd&apos;hui.
        </p>
      </motion.div>

      {/* Stats grid — gradient colored cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Départs aujourd'hui"
          value="47"
          description="+12% vs hier"
          icon={Bus}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Passagers estimés"
          value="1,284"
          description="Données temps réel"
          icon={Users}
          gradient="bg-gradient-to-br from-orange-500 to-red-500"
          trend="+8%"
          trendUp
        />
        <StatCard
          title="Lignes actives"
          value="12"
          description="2 en maintenance"
          icon={MapPin}
          gradient="bg-gradient-to-br from-violet-500 to-purple-700"
        />
        <StatCard
          title="Revenus publicitaires"
          value="245K"
          description="Objectif 400K ce mois"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
          trend="+18%"
          trendUp
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent departures */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Prochains départs</CardTitle>
                <CardDescription>
                  Mises à jour en temps réel toutes les 30 secondes
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <Activity className="h-3 w-3 text-emerald-500" />
                En direct
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_DEPARTURES.map((departure, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
                      <Bus className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {departure.line}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {departure.operator}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-mono font-medium">
                          {departure.time}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Quai {departure.platform}
                      </div>
                    </div>
                    <Badge
                      variant={
                        departure.status === "À l'heure"
                          ? "default"
                          : departure.status === "Complet"
                            ? "secondary"
                            : "destructive"
                      }
                      className="shrink-0 text-xs"
                    >
                      {departure.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accès rapide</CardTitle>
              <CardDescription>
                Actions fréquentes pour votre quotidien
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 p-3"
                asChild
              >
                <a href={`/display/${session?.user?.stationId ?? ""}`}>
                  <Monitor className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Kiosque</div>
                    <div className="text-xs text-muted-foreground">
                      Affichage dynamique temps réel
                    </div>
                  </div>
                </a>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 p-3"
                asChild
              >
                <a href={`/station/${session?.user?.stationId ?? ""}/lines`}>
                  <Bus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Gérer les lignes</div>
                    <div className="text-xs text-muted-foreground">
                      Ajouter, modifier, importer des départs
                    </div>
                  </div>
                </a>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 p-3"
                asChild
              >
                <a href={`/station/${session?.user?.stationId ?? ""}/notifications`}>
                  <Volume2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Envoyer une annonce</div>
                    <div className="text-xs text-muted-foreground">
                      TTS, push, message vocal
                    </div>
                  </div>
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Station info */}
          <Card className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Gare de Dakar — Centrale</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Planification activée • 12 lignes • 4 quais
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Plan Starter
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
