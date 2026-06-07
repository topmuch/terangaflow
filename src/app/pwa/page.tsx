"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bus,
  Bell,
  Store,
  AlertTriangle,
  Clock,
  MapPin,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DepartureItem {
  id: string;
  destination: string;
  lineCode: string;
  operatorName: string;
  departureTime: string;
  platform: string | null;
  status: string;
}

interface StationInfo {
  id: string;
  name: string;
  code: string;
  city: string;
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: {
    label: "À l'heure",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  },
  boarding: {
    label: "Embarquement",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  },
  delayed: {
    label: "Retard",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  },
  departed: {
    label: "Parti",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  },
  cancelled: {
    label: "Annulé",
    color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  },
  arrived: {
    label: "Arrivé",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  },
};

// ─── Countdown Helper ─────────────────────────────────────────────────────────

function getCountdown(departureTime: string): string {
  const now = Date.now();
  const departure = new Date(departureTime).getTime();
  const diffMs = departure - now;

  if (diffMs <= 0) return "Maintenant";

  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const remainMin = diffMin % 60;

  if (diffH > 0) return `${diffH}h ${remainMin.toString().padStart(2, "0")}`;
  return `${diffMin} min`;
}

function isUrgent(departureTime: string): boolean {
  const diffMs = new Date(departureTime).getTime() - Date.now();
  return diffMs > 0 && diffMs < 10 * 60 * 1000;
}

// ─── Live Clock ─────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="font-mono text-sm">{time}</span>;
}

// ─── Main PWA Home Page ──────────────────────────────────────────────────────

export default function PwaHomePage() {
  const [station, setStation] = useState<StationInfo | null>(null);
  const [departures, setDepartures] = useState<DepartureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stationId] = useState("cmq3355jq0002oxdyh8dnlfku");

  const fetchDepartures = useCallback(async () => {
    try {
      const response = await fetch(`/api/departures/${stationId}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setStation(data.station);
      setDepartures(data.departures || []);
      setLastUpdate(new Date());
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchDepartures]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      {/* ─── Station Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">
                {station?.name || "Gare Centrale de Dakar"}
              </h1>
              <div className="flex items-center gap-1.5 text-white/80 text-xs">
                <MapPin className="h-3 w-3" />
                {station?.code || "DKR-01"} — {station?.city || "Dakar"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-bold">
              <LiveClock />
            </div>
            <div className="text-[10px] text-white/70">
              {lastUpdate
                ? `MAJ ${lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                : "Chargement…"}
            </div>
          </div>
        </div>

        {!isOnline && (
          <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2 text-xs">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>Mode hors ligne — données mises en cache</span>
          </div>
        )}
      </div>

      {/* ─── Departures List ──────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Prochains départs
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDepartures}
            disabled={isLoading}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : departures.length === 0 ? (
          <Card className="overflow-hidden">
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun départ prévu dans les prochaines heures
              </p>
            </CardContent>
          </Card>
        ) : (
          departures.map((trip) => {
            const statusConf = (STATUS_CONFIG[trip.status] || STATUS_CONFIG.scheduled) ?? { label: "À l'heure", color: "bg-emerald-100 text-emerald-700" };
            const urgent = isUrgent(trip.departureTime);

            return (
              <Card
                key={trip.id}
                className={`overflow-hidden transition-all ${
                  urgent
                    ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-500/5 ring-1 ring-amber-500/20"
                    : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">
                          {trip.destination}
                        </h3>
                        {urgent && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {trip.operatorName}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">•</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {trip.lineCode}
                        </span>
                        {trip.platform && (
                          <>
                            <span className="text-[10px] text-muted-foreground/60">•</span>
                            <span className="text-xs text-muted-foreground">
                              Quai {trip.platform}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold font-mono ${
                          urgent ? "text-amber-600 dark:text-amber-400" : ""
                        }`}
                      >
                        {new Date(trip.departureTime).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`mt-1 text-[10px] px-1.5 py-0 h-5 ${statusConf.color}`}
                      >
                        {statusConf.label}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                        {getCountdown(trip.departureTime)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Quick action links */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link href="/alerts/subscribe/cmq3355jq0002oxdyh8dnlfku">
            <Card className="overflow-hidden hover:shadow-md transition-shadow active:scale-[0.98]">
              <CardContent className="p-3 flex flex-col items-center gap-1.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium">Activer les alertes</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/pwa/services">
            <Card className="overflow-hidden hover:shadow-md transition-shadow active:scale-[0.98]">
              <CardContent className="p-3 flex flex-col items-center gap-1.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium">Services & boutiques</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
