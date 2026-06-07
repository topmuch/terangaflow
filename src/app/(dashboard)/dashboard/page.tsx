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

// ─── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, description, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <Badge
                variant="secondary"
                className={`text-xs gap-1 ${trendUp ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" : "text-destructive bg-destructive/10"}`}
              >
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : null}
                {trend}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
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

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Départs aujourd'hui"
          value="47"
          description="+12% vs hier"
          icon={Bus}
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Passagers estimés"
          value="1,284"
          description="Données mises à jour en temps réel"
          icon={Users}
          trend="+8%"
          trendUp
        />
        <StatCard
          title="Lignes actives"
          value="12"
          description="2 lignes en maintenance"
          icon={MapPin}
        />
        <StatCard
          title="Revenus publicitaires"
          value="245K FCFA"
          description="Ce mois — objectif 400K"
          icon={TrendingUp}
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                      <Bus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
                <a href="/dashboard/kiosk">
                  <Monitor className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
                <a href="/dashboard/lines">
                  <Bus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
                <a href="/dashboard/notifications">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
          <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
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
