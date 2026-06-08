"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  Clock,
  Bus,
  Volume2,
  VolumeX,
  Square,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import {
  useDepartureNotifier,
  type UpcomingDeparture,
} from "@/hooks/useDepartureNotifier";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDepartureTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatAlertTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function getCountdownColor(min: number): string {
  if (min <= 0) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40";
  if (min <= 5) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40";
  if (min <= 15) return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40";
  return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40";
}

function getCountdownLabel(min: number): string {
  if (min <= 0) return "MAINTENANT";
  if (min === 1) return "1 min";
  return `${min} min`;
}

// ─── Countdown Timer Component ────────────────────────────────────────────────

function CountdownTimer({ departure }: { departure: UpcomingDeparture }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        departure.isNow
          ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 shadow-sm"
          : departure.isImminent
            ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
            : "border-border bg-card hover:bg-muted/50"
      )}
    >
      {/* Countdown */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[72px] font-mono font-bold text-lg",
          getCountdownColor(departure.minutesRemaining)
        )}
      >
        <span className="text-xs font-medium opacity-70">Compte à rebours</span>
        <span className="leading-tight">
          {getCountdownLabel(departure.minutesRemaining)}
        </span>
      </div>

      {/* Trip info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Bus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold text-sm truncate">
            {departure.trip.lineName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{departure.trip.operatorName}</span>
          <span className="text-muted-foreground/40">|</span>
          <span>Départ {formatDepartureTime(departure.trip.departureTime)}</span>
          {departure.trip.platform && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <span>Quai {departure.trip.platform}</span>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      {departure.isNow && (
        <Badge className="bg-red-600 text-white text-xs shrink-0 animate-pulse">
          Départ
        </Badge>
      )}
      {departure.isImminent && !departure.isNow && (
        <Badge className="bg-amber-500 text-white text-xs shrink-0">
          Bientôt
        </Badge>
      )}
    </div>
  );
}

// ─── Alert Item Component ────────────────────────────────────────────────────

function AlertItem({
  alert,
  onDismiss,
}: {
  alert: {
    id: string;
    type: "departure" | "imminent";
    destination: string;
    platform: string | null;
    triggeredAt: string;
  };
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border-l-4",
        alert.type === "departure"
          ? "bg-red-50 border-red-500 dark:bg-red-950/30 dark:border-red-600"
          : "bg-amber-50 border-amber-500 dark:bg-amber-950/30 dark:border-amber-600"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {alert.type === "departure" ? (
            <BellRing className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="font-medium text-sm truncate">
            {alert.destination}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {alert.type === "departure"
            ? `Départ annoncé${alert.platform ? ` — Quai ${alert.platform}` : ""}`
            : `Départ dans 5 min${alert.platform ? ` — Quai ${alert.platform}` : ""}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono text-muted-foreground">
          {formatAlertTime(alert.triggeredAt)}
        </span>
        <button
          onClick={() => onDismiss(alert.id)}
          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Ignorer"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyCountdown() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Clock className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Aucun départ à venir
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
        Les prochains départs apparaîtront ici avec un compte à rebours et une
        alerte vocale automatique.
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface DepartureAlertPanelProps {
  stationId: string | undefined;
}

export function DepartureAlertPanel({ stationId }: DepartureAlertPanelProps) {
  const {
    upcomingDepartures,
    alerts,
    isAlerting,
    isAudioEnabled,
    isMonitoring,
    setIsMonitoring,
    manualTriggerAlert,
    stopAlert,
    dismissAlert,
    clearAlerts,
  } = useDepartureNotifier(stationId);

  const [showTest, setShowTest] = useState(false);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Alerte Départ Auto
            </h2>
            <p className="text-xs text-muted-foreground">
              Ding-dong + annonce vocale à l&apos;heure du départ
            </p>
          </div>
        </div>

        {/* Audio + Monitoring toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="monitoring-toggle"
              checked={isMonitoring}
              onCheckedChange={setIsMonitoring}
              aria-label="Activer la surveillance"
            />
            <Label
              htmlFor="monitoring-toggle"
              className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
            >
              {isMonitoring ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              Surveillance
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ Column A: Upcoming Departures with Countdown ═══ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-rose-500" />
                Prochains Départs
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {upcomingDepartures.length} trajet(s)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Surveillance automatique toutes les 30 secondes
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {upcomingDepartures.length === 0 ? (
                <EmptyCountdown />
              ) : (
                <AnimatePresence>
                  {upcomingDepartures.map((dep) => (
                    <CountdownTimer
                      key={dep.trip.id}
                      departure={dep}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ═══ Column B: Alert History ═══ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Volume2 className="h-4 w-4 text-rose-500" />
                Journal des Alertes
              </CardTitle>
              {alerts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={clearAlerts}
                >
                  Effacer tout
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAudioEnabled
                ? "🔊 Audio activé — notifications sonores actives"
                : "🔇 Cliquez n'importe où pour activer l'audio"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Volume2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Aucune alerte encore
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                    Les alertes vocales se déclencheront automatiquement 5 min
                    avant et à l&apos;heure du départ.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {alerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      onDismiss={dismissAlert}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Testing Section ═══ */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="h-4 w-4" />
              Zone de Test
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowTest(!showTest)}
            >
              {showTest ? "Masquer" : "Afficher"}
            </Button>
          </div>
        </CardHeader>
        {showTest && (
          <CardContent className="space-y-3">
            {upcomingDepartures.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {upcomingDepartures.slice(0, 5).map((dep) => (
                  <Button
                    key={dep.trip.id}
                    variant="outline"
                    size="sm"
                    className="text-xs min-h-[44px]"
                    disabled={isAlerting || !isAudioEnabled}
                    onClick={() => manualTriggerAlert(dep.trip)}
                  >
                    {isAlerting ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Volume2 className="h-3 w-3 mr-1" />
                    )}
                    Tester: {dep.trip.lineName}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pas de trajets à venir pour tester. Ajoutez des trajets pour activer
                les alertes de départ.
              </p>
            )}

            {isAlerting && (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs min-h-[44px]"
                onClick={stopAlert}
              >
                <Square className="h-3 w-3 mr-1 fill-current" />
                Arrêter l&apos;alerte
              </Button>
            )}

            {!isAudioEnabled && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <VolumeX className="h-3 w-3" />
                Cliquez n&apos;importe où sur la page pour activer l&apos;audio
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* ═══ Floating Alerting Indicator ═══ */}
      {isAlerting && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-rose-600 to-pink-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3"
        >
          <BellRing className="h-5 w-5 shrink-0 animate-bounce" />
          <div className="min-w-0">
            <p className="font-bold text-sm">Alerte Départ en cours...</p>
            <p className="text-xs opacity-90">
              Ding-dong + annonce vocale
            </p>
          </div>
          <button
            onClick={stopAlert}
            className="ml-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors shrink-0"
            aria-label="Arrêter l'alerte"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
