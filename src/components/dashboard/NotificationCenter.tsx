"use client";

import { useState, useEffect, useRef } from "react";
import {
  Megaphone,
  User,
  Bus,
  AlertTriangle,
  Volume2,
  Loader2,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createManualAnnouncement } from "@/app/api/actions/announcements";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BroadcastLog {
  time: string;
  msg: string;
  type: "manual" | "auto";
  success: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface NotificationCenterProps {
  stationId: string | undefined;
}

export function NotificationCenter({ stationId }: NotificationCenterProps) {
  // ─── Form states ──────────────────────────────────────────────────────────
  const [passengerName, setPassengerName] = useState("");
  const [passengerLocation, setPassengerLocation] = useState("");
  const [driverDestination, setDriverDestination] = useState("");
  const [driverPlatform, setDriverPlatform] = useState("");
  const [emergencyMsg, setEmergencyMsg] = useState("");
  const [repeatEmergency, setRepeatEmergency] = useState(false);

  // ─── Logs ─────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<BroadcastLog[]>([]);

  // ─── Loading states ────────────────────────────────────────────────────────
  const [sendingPassenger, setSendingPassenger] = useState(false);
  const [sendingDriver, setSendingDriver] = useState(false);
  const [sendingEmergency, setSendingEmergency] = useState(false);

  // ─── Emergency repeat ref ──────────────────────────────────────────────────
  const emergencyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Cleanup emergency repeat on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (emergencyIntervalRef.current) {
        clearInterval(emergencyIntervalRef.current);
      }
    };
  }, []);

  const addLog = (msg: string, type: "manual" | "auto", success: boolean) => {
    const time = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [{ time, msg, type, success }, ...prev].slice(0, 20));
  };

  // ─── Emergency repeat logic ────────────────────────────────────────────────
  const startEmergencyRepeat = (msg: string) => {
    if (emergencyIntervalRef.current) {
      clearInterval(emergencyIntervalRef.current);
    }
    emergencyIntervalRef.current = setInterval(async () => {
      const result = await createManualAnnouncement("emergency", { message: msg });
      addLog(`URGENCE (répétition): ${msg}`, "manual", !!result.success);
    }, 120_000);
  };

  const stopEmergencyRepeat = () => {
    if (emergencyIntervalRef.current) {
      clearInterval(emergencyIntervalRef.current);
      emergencyIntervalRef.current = null;
    }
    setRepeatEmergency(false);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handlePassengerCall = async () => {
    if (!passengerName || !passengerLocation) {
      toast.error("Veuillez remplir le nom et le lieu.");
      return;
    }

    setSendingPassenger(true);
    try {
      const result = await createManualAnnouncement("passenger", {
        name: passengerName,
        location: passengerLocation,
      });

      if (result.success) {
        toast.success(`Appel passager envoyé au kiosk: ${passengerName}`);
        addLog(`Appel passager: ${passengerName} (${passengerLocation}) 🖥️`, "manual", true);
        setPassengerName("");
        setPassengerLocation("");
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
        addLog(`Appel passager: ${passengerName} — ÉCHEC`, "manual", false);
      }
    } catch {
      toast.error("Erreur réseau.");
      addLog(`Appel passager: ${passengerName} — ERREUR`, "manual", false);
    } finally {
      setSendingPassenger(false);
    }
  };

  const handleDriverCall = async () => {
    if (!driverDestination || !driverPlatform) {
      toast.error("Veuillez remplir la destination et le quai.");
      return;
    }

    setSendingDriver(true);
    try {
      const result = await createManualAnnouncement("driver", {
        destination: driverDestination,
        platform: driverPlatform,
      });

      if (result.success) {
        toast.success(`Appel chauffeur envoyé au kiosk: ${driverDestination}`);
        addLog(`Appel chauffeur: ${driverDestination} (${driverPlatform}) 🖥️`, "manual", true);
        setDriverDestination("");
        setDriverPlatform("");
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
        addLog(`Appel chauffeur: ${driverDestination} — ÉCHEC`, "manual", false);
      }
    } catch {
      toast.error("Erreur réseau.");
      addLog(`Appel chauffeur: ${driverDestination} — ERREUR`, "manual", false);
    } finally {
      setSendingDriver(false);
    }
  };

  const handleEmergency = async () => {
    if (!emergencyMsg) {
      toast.error("Veuillez saisir un message d'urgence.");
      return;
    }

    setSendingEmergency(true);
    try {
      const result = await createManualAnnouncement("emergency", {
        message: emergencyMsg,
      });

      if (result.success) {
        toast.success("Message d'urgence diffusé sur le kiosk");
        addLog(`URGENCE: ${emergencyMsg} 🖥️`, "manual", true);
        if (repeatEmergency) {
          startEmergencyRepeat(emergencyMsg);
        }
        setEmergencyMsg("");
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
        addLog(`URGENCE: ${emergencyMsg} — ÉCHEC`, "manual", false);
      }
    } catch {
      toast.error("Erreur réseau.");
      addLog(`URGENCE: ${emergencyMsg} — ERREUR`, "manual", false);
    } finally {
      setSendingEmergency(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const isAnySending = sendingPassenger || sendingDriver || sendingEmergency;

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
            Les annonces sont envoyées à l&apos;écran kiosk pour diffusion PA
            <span className="ml-1 text-emerald-500">● Automatique + Base de données</span>
          </p>
        </div>
      </div>

      <Separator />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Formulaires (2 cols) ═══ */}
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
                  <Label htmlFor="passenger-name" className="text-xs">Nom du passager</Label>
                  <Input
                    id="passenger-name"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Ex: Mamadou Sy"
                    disabled={isAnySending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passenger-location" className="text-xs">Lieu / Guichet</Label>
                  <Input
                    id="passenger-location"
                    value={passengerLocation}
                    onChange={(e) => setPassengerLocation(e.target.value)}
                    placeholder="Ex: Guichet 2"
                    disabled={isAnySending}
                  />
                </div>
              </div>
              <Button
                onClick={handlePassengerCall}
                disabled={isAnySending || !passengerName || !passengerLocation}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
              >
                {sendingPassenger ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {sendingPassenger ? "Envoi en cours..." : "Diffuser sur le kiosk"}
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
                  <Label htmlFor="driver-destination" className="text-xs">Destination</Label>
                  <Input
                    id="driver-destination"
                    value={driverDestination}
                    onChange={(e) => setDriverDestination(e.target.value)}
                    placeholder="Ex: Mbour"
                    disabled={isAnySending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="driver-platform" className="text-xs">Quai</Label>
                  <Input
                    id="driver-platform"
                    value={driverPlatform}
                    onChange={(e) => setDriverPlatform(e.target.value)}
                    placeholder="Ex: Quai 3"
                    disabled={isAnySending}
                  />
                </div>
              </div>
              <Button
                onClick={handleDriverCall}
                disabled={isAnySending || !driverDestination || !driverPlatform}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white min-h-[44px]"
              >
                {sendingDriver ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {sendingDriver ? "Envoi en cours..." : "Diffuser sur le kiosk"}
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
                <Label htmlFor="emergency-msg" className="text-xs">Message d&apos;urgence</Label>
                <Textarea
                  id="emergency-msg"
                  value={emergencyMsg}
                  onChange={(e) => setEmergencyMsg(e.target.value)}
                  placeholder="Tapez votre message d'urgence ici..."
                  rows={3}
                  disabled={isAnySending}
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
                  disabled={isAnySending || !emergencyMsg}
                  className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] animate-pulse"
                >
                  {sendingEmergency ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                  {sendingEmergency ? "Envoi en cours..." : "DIFFUSER EN URGENCE"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ═══ Journal des Diffusions (1 col) ═══ */}
        <section className="space-y-6">
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
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
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
                      !log.success
                        ? "bg-red-50 border-red-400 dark:bg-red-950/30 dark:border-red-600"
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
                          !log.success
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        )}
                      >
                        {!log.success ? "Échec" : "Manuel"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
