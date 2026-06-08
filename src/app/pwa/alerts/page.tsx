"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Wifi,
  CheckCircle2,
  AlertCircle,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushSubscription } from "@/hooks/usePushSubscription";

// ─── Alerts Page ─────────────────────────────────────────────────────────────

export default function PwaAlertsPage() {
  const push = usePushSubscription();
  const [stationId] = useState("cmq3355jq0002oxdyh8dnlfku");

  // Mock alerts for demo — initialized directly in useState
  const [alerts, setAlerts] = useState<Array<{ id: string; title: string; body: string; time: string; read: boolean }>>(() => [
    {
      id: "1",
      title: "Retard signalé — Saint-Louis",
      body: "Le départ DKR-SLS prévu à 08h30 est retardé d'environ 15 minutes. Quai A3.",
      time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: "2",
      title: "Embarquement ouvert — Thiès",
      body: "Le départ SATAS vers Thiès est ouvert à l'embarquement. Quai B1.",
      time: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: "3",
      title: "Quai modifié — Kaolack",
      body: "Le départ SOTRAL vers Kaolack est déplacé au Quai A2 (au lieu de A1).",
      time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      read: true,
    },
  ]);

  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="flex flex-col min-h-full">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Alertes</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Toutes les notifications lues"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── Push Status Card ───────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <Card className={`overflow-hidden ${push.isSubscribed ? "border-emerald-200 dark:border-emerald-500/30" : ""}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  push.isSubscribed
                    ? "bg-emerald-100 dark:bg-emerald-500/20"
                    : "bg-amber-100 dark:bg-amber-500/20"
                }`}
              >
                {push.isSubscribed ? (
                  <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <BellOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">
                  Notifications push
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {push.isSubscribed
                    ? "Recevez les alertes en temps réel"
                    : "Activez pour ne rien manquer"}
                </p>
              </div>
              <Switch
                checked={push.isSubscribed}
                onCheckedChange={(checked) => {
                  if (checked) {
                    push.subscribe(stationId);
                  } else {
                    push.unsubscribe();
                  }
                }}
                disabled={push.isLoading}
                aria-label="Activer les notifications push"
              />
            </div>

            {/* Error display */}
            {push.error && (
              <div className="mt-2 flex items-start gap-2 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{push.error}</span>
              </div>
            )}

            {!push.isSubscribed && (
              <Link
                href={`/alerts/subscribe/${stationId}`}
                className="mt-2 block text-center"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                >
                  Configurer mes alertes
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Alerts List ───────────────────────────────────────────────── */}
      <div className="px-4 pb-4 space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Notifications récentes
        </h2>

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune notification pour le moment
              </p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`overflow-hidden cursor-pointer transition-colors ${
                !alert.read
                  ? "border-blue-200 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-500/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => markAsRead(alert.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      !alert.read ? "bg-blue-500" : "bg-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">
                        {alert.title}
                      </h3>
                      {!alert.read && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 shrink-0"
                        >
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {alert.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {formatTimeAgo(alert.time)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeAgo(isoTime: string): string {
  const diffMs = Date.now() - new Date(isoTime).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  return `Il y a ${Math.floor(diffH / 24)}j`;
}
