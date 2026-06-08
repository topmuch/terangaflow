"use client";

import { useState, useEffect, useRef } from "react";
import { useHybridAudioPlayer } from "@/hooks/useHybridAudioPlayer";
import type { AudioSegment } from "@/hooks/useHybridAudioPlayer";
import { useAudioBroadcaster } from "@/hooks/useAudioBroadcast";
import {
  Megaphone,
  User,
  Bus,
  AlertTriangle,
  Clock,
  Package,
  ShieldCheck,
  History,
  Volume2,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BroadcastLog {
  time: string;
  msg: string;
  type: "manual" | "auto";
}

// ─── Automated Reminder Items ────────────────────────────────────────────────

interface ReminderItem {
  key: string;
  label: string;
  description: string;
  icon: typeof Package;
  color: string;
  audioSrc: string;
}

const REMINDERS: ReminderItem[] = [
  {
    key: "baggage",
    label: "Sécurité des bagages",
    description: "Toutes les 45 min",
    icon: Package,
    color: "text-blue-600",
    audioSrc: "/audio/rappel_bagages.mp3",
  },
  {
    key: "valuables",
    label: "Valeurs personnelles",
    description: "Toutes les 1h30",
    icon: ShieldCheck,
    color: "text-amber-600",
    audioSrc: "/audio/rappel_valeurs.mp3",
  },
  {
    key: "closing",
    label: "Fermeture guichets",
    description: "Automatique",
    icon: Clock,
    color: "text-red-600",
    audioSrc: "/audio/ding-dong.mp3",
  },
  {
    key: "rain",
    label: "Mode intempéries",
    description: "Manuel",
    icon: AlertTriangle,
    color: "text-cyan-600",
    audioSrc: "/audio/ding-dong.mp3",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  stationId: string | undefined;
}

export function NotificationCenter({ stationId }: NotificationCenterProps) {
  const { isPlaying, currentMessage, initializeAudio, playSequence, stop } =
    useHybridAudioPlayer();
  const { isConnected: wsConnected, broadcast } = useAudioBroadcaster(stationId);

  // ─── Form states ──────────────────────────────────────────────────────────
  const [passengerName, setPassengerName] = useState("");
  const [passengerLocation, setPassengerLocation] = useState("");
  const [driverDestination, setDriverDestination] = useState("");
  const [driverPlatform, setDriverPlatform] = useState("");
  const [emergencyMsg, setEmergencyMsg] = useState("");
  const [repeatEmergency, setRepeatEmergency] = useState(false);

  // ─── Reminder states ───────────────────────────────────────────────────────
  const [autoReminders, setAutoReminders] = useState<Record<string, boolean>>({
    baggage: true,
    valuables: true,
    closing: false,
    rain: false,
  });

  // ─── Logs ─────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<BroadcastLog[]>([]);

  // ─── Emergency repeat ref ──────────────────────────────────────────────────
  const emergencyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Init audio on first click ────────────────────────────────────────────
  useEffect(() => {
    const handleFirstClick = () => {
      initializeAudio();
      document.removeEventListener("click", handleFirstClick);
    };
    document.addEventListener("click", handleFirstClick);
    return () => document.removeEventListener("click", handleFirstClick);
  }, [initializeAudio]);

  // ─── Cleanup emergency repeat on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (emergencyIntervalRef.current) {
        clearInterval(emergencyIntervalRef.current);
      }
    };
  }, []);

  const addLog = (msg: string, type: "manual" | "auto") => {
    const time = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [{ time, msg, type }, ...prev].slice(0, 20));
  };

  // ─── Emergency repeat logic ────────────────────────────────────────────────
  const startEmergencyRepeat = (msg: string) => {
    if (emergencyIntervalRef.current) {
      clearInterval(emergencyIntervalRef.current);
    }
    const seq = buildEmergencySequence(msg);
    emergencyIntervalRef.current = setInterval(() => {
      playSequence(seq);
      addLog(`URGENCE (répétition): ${msg}`, "manual");
    }, 120_000);
  };

  const stopEmergencyRepeat = () => {
    if (emergencyIntervalRef.current) {
      clearInterval(emergencyIntervalRef.current);
      emergencyIntervalRef.current = null;
    }
    setRepeatEmergency(false);
  };

  // ─── Sequence builders ────────────────────────────────────────────────────

  const buildPassengerSequence = (name: string, location: string): AudioSegment[] => [
    { type: "ding-dong" },
    { type: "tts", text: `Le passager ${name}` },
    { type: "tts", text: `est attendu au ${location}.` },
  ];

  const buildDriverSequence = (destination: string, platform: string): AudioSegment[] => [
    { type: "ding-dong" },
    { type: "tts", text: `Le chauffeur du bus pour ${destination}` },
    { type: "tts", text: `est attendu au ${platform}.` },
  ];

  const buildEmergencySequence = (msg: string): AudioSegment[] => [
    { type: "ding-dong" },
    { type: "tts", text: "Attention. Message important." },
    { type: "tts", text: msg },
  ];

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handlePassengerCall = async () => {
    if (!passengerName || !passengerLocation) return;
    const seq = buildPassengerSequence(passengerName, passengerLocation);
    // Broadcast to kiosk displays
    broadcast({ type: "passenger_call", segments: seq });
 // Play locally on admin
    await playSequence(seq);
    addLog(`Appel passager: ${passengerName} (${passengerLocation}) ${wsConnected ? "🔊 + 🖥️" : "🔊"}`, "manual");
    setPassengerName("");
    setPassengerLocation("");
  };

  const handleDriverCall = async () => {
    if (!driverDestination || !driverPlatform) return;
    const seq = buildDriverSequence(driverDestination, driverPlatform);
    // Broadcast to kiosk displays
    broadcast({ type: "driver_call", segments: seq });
    // Play locally on admin
    await playSequence(seq);
    addLog(`Appel chauffeur: ${driverDestination} (${driverPlatform}) ${wsConnected ? "🔊 + 🖥️" : "🔊"}`, "manual");
    setDriverDestination("");
    setDriverPlatform("");
  };

  const handleEmergency = async () => {
    if (!emergencyMsg) return;
    const seq = buildEmergencySequence(emergencyMsg);
    // Broadcast to kiosk displays
    broadcast({ type: "emergency", segments: seq });
    // Play locally on admin
    await playSequence(seq);
    addLog(`URGENCE: ${emergencyMsg} ${wsConnected ? "🔊 + 🖥️" : "🔊"}`, "manual");
    if (repeatEmergency) {
      startEmergencyRepeat(emergencyMsg);
    }
    setEmergencyMsg("");
  };

  const triggerAutoReminder = async (item: ReminderItem) => {
    const seq: AudioSegment[] = [
      { type: "ding-dong" },
    ];
    await playSequence(seq);
    addLog(`Rappel automatique : ${item.label}`, "auto");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Centre de Diffusion Audio
          </h2>
          <p className="text-xs text-muted-foreground">
            Annonces vocales hybrides (MP3 + Synthèse vocale)
            {wsConnected ? (
              <span className="ml-1 text-emerald-500">● Kiosk connecté</span>
            ) : (
              <span className="ml-1 text-muted-foreground/60">● Kiosk déconnecté</span>
            )}
          </p>
        </div>
      </div>

      <Separator />

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ ZONE A : Diffusion Immédiate (2 cols) ═══ */}
        <section className="lg:col-span-2 space-y-6">
          {/* ─── Appel Voyageur ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <User className="h-4 w-4" />
                </div>
                Appel Voyageur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="passenger-name" className="text-xs">
                    Nom du passager
                  </Label>
                  <Input
                    id="passenger-name"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Ex: Mamadou Sy"
                    disabled={isPlaying}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passenger-location" className="text-xs">
                    Lieu / Guichet
                  </Label>
                  <Input
                    id="passenger-location"
                    value={passengerLocation}
                    onChange={(e) => setPassengerLocation(e.target.value)}
                    placeholder="Ex: Guichet 2"
                    disabled={isPlaying}
                  />
                </div>
              </div>
              <Button
                onClick={handlePassengerCall}
                disabled={isPlaying || !passengerName || !passengerLocation}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
              >
                <Volume2 className="mr-2 h-4 w-4" />
                Diffuser l&apos;appel
              </Button>
            </CardContent>
          </Card>

          {/* ─── Appel Chauffeur ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Bus className="h-4 w-4" />
                </div>
                Appel Chauffeur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="driver-destination" className="text-xs">
                    Destination
                  </Label>
                  <Input
                    id="driver-destination"
                    value={driverDestination}
                    onChange={(e) => setDriverDestination(e.target.value)}
                    placeholder="Ex: Mbour"
                    disabled={isPlaying}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver-platform" className="text-xs">
                    Quai
                  </Label>
                  <Input
                    id="driver-platform"
                    value={driverPlatform}
                    onChange={(e) => setDriverPlatform(e.target.value)}
                    placeholder="Ex: Quai 3"
                    disabled={isPlaying}
                  />
                </div>
              </div>
              <Button
                onClick={handleDriverCall}
                disabled={isPlaying || !driverDestination || !driverPlatform}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white min-h-[44px]"
              >
                <Volume2 className="mr-2 h-4 w-4" />
                Diffuser l&apos;appel
              </Button>
            </CardContent>
          </Card>

          {/* ─── Message d'Urgence ─── */}
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/50">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                Message d&apos;Urgence Libre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="emergency-msg" className="text-xs">
                  Message d&apos;urgence
                </Label>
                <Textarea
                  id="emergency-msg"
                  value={emergencyMsg}
                  onChange={(e) => setEmergencyMsg(e.target.value)}
                  placeholder="Tapez votre message d'urgence ici..."
                  rows={3}
                  disabled={isPlaying}
                  className="resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="repeat-emergency"
                    checked={repeatEmergency}
                    onCheckedChange={(checked) => {
                      setRepeatEmergency(checked);
                      if (!checked) stopEmergencyRepeat();
                    }}
                  />
                  <Label htmlFor="repeat-emergency" className="text-xs text-muted-foreground cursor-pointer">
                    Répéter toutes les 2 min
                  </Label>
                </div>
                <Button
                  onClick={handleEmergency}
                  disabled={isPlaying || !emergencyMsg}
                  className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] animate-pulse"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  DIFFUSER EN URGENCE
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ═══ ZONE B & C : Rappels + Journal (1 col) ═══ */}
        <section className="space-y-6">
          {/* ─── Rappels Automatisés ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Clock className="h-4 w-4" />
                </div>
                Rappels Automatisés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {REMINDERS.map((item) => {
                const Icon = item.icon;
                const isActive = autoReminders[item.key] ?? false;

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={cn("h-5 w-5 shrink-0", item.color)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => {
                        setAutoReminders((prev) => ({
                          ...prev,
                          [item.key]: checked,
                        }));
                        if (checked) triggerAutoReminder(item);
                      }}
                      aria-label={item.label}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* ─── Journal des Diffusions ─── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <History className="h-4 w-4" />
                </div>
                Journal des Diffusions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {logs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune diffusion récente.
                  </p>
                )}
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-l-4",
                      log.type === "auto"
                        ? "bg-emerald-50 border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-600"
                        : "bg-blue-50 border-blue-400 dark:bg-blue-950/30 dark:border-blue-600"
                    )}
                  >
                    <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">
                      {log.time}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm break-all">{log.msg}</p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "mt-1 text-[10px] uppercase font-bold",
                          log.type === "auto"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        )}
                      >
                        {log.type === "auto" ? "Automatique" : "Manuel"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ═══ Floating playing indicator ═══ */}
      {isPlaying && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse">
          <Megaphone className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm">Diffusion en cours...</p>
            <p className="text-xs opacity-90 truncate max-w-[200px]">
              {currentMessage}
            </p>
          </div>
          <button
            onClick={stop}
            className="ml-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors shrink-0"
            aria-label="Arrêter la diffusion"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
}
