"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import {
  UserCircle,
  Bell,
  BellOff,
  Shield,
  ChevronRight,
  Download,
  Info,
  Wifi,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

// ─── Profile Page ────────────────────────────────────────────────────────────

export default function PwaProfilePage() {
  const push = usePushSubscription();
  const [stationId] = useState("cmq3355jq0002oxdyh8dnlfku");

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold">Profil</h1>
            <p className="text-xs text-muted-foreground">
              Paramètres & préférences
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Push Notifications */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              {push.isSubscribed ? (
                <Wifi className="h-5 w-5 text-emerald-500" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <h2 className="text-sm font-semibold">Notifications</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Notifications push</p>
                <p className="text-xs text-muted-foreground">
                  {push.isSubscribed
                    ? "Vous recevez les alertes en temps réel"
                    : push.permission === "denied"
                      ? "Notifications bloquées par votre navigateur"
                      : "Recevez les alertes de votre gare"}
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
                disabled={
                  push.isLoading ||
                  push.permission === "denied" ||
                  !push.isSupported
                }
                aria-label="Activer les notifications push"
              />
            </div>

            {push.error && (
              <div className="bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {push.error}
              </div>
            )}

            {!push.isSupported && (
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                Les notifications push ne sont pas supportées dans ce navigateur.
              </div>
            )}

            {push.isSubscribed && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => push.unsubscribe()}
                disabled={push.isLoading}
              >
                <BellOff className="h-3.5 w-3.5 mr-1" />
                Se désabonner
              </Button>
            )}

            {!push.isSubscribed && push.permission !== "denied" && (
              <Link href={`/alerts/subscribe/${stationId}`}>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => push.subscribe(stationId)}
                  disabled={push.isLoading}
                >
                  <Bell className="h-3.5 w-3.5 mr-1" />
                  {push.isLoading ? "Activation…" : "Activer les notifications"}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* App Installation */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-semibold">Application</h2>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Installez TerangaFlow sur votre appareil pour un accès rapide
              aux horaires, même hors ligne.
            </p>

            <InstallPrompt />
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Confidentialité</h2>
            </div>

            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                TerangaFlow respecte votre vie privée conformément au RGPD.
                Vos données de localisation ne sont jamais partagées.
              </p>
              <p>
                Les notifications push sont utilisées uniquement pour vous
                informer des changements liés à votre gare.
              </p>
            </div>

            <Separator />

            <div className="space-y-1">
              <a
                href="#"
                className="flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Politique de confidentialité</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#"
                className="flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Conditions d&apos;utilisation</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#"
                className="flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Gérer mes données</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <div className="text-center pb-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            TerangaFlow v1.0.0 — L&apos;hospitalité en plus.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Install Prompt Component ─────────────────────────────────────────────────

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const isStandalone = useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia("(display-mode: standalone)");
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false
  );

  const isInstalled = installed || isStandalone;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setInstalled(true);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2.5 text-xs text-emerald-600 dark:text-emerald-400">
        <Download className="h-4 w-4 shrink-0" />
        <span>Application installée</span>
      </div>
    );
  }

  if (!deferredPrompt) {
    return (
      <div className="bg-muted/50 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Pour installer, utilisez le menu de votre navigateur
            et sélectionnez «&nbsp;Ajouter à l&apos;écran d&apos;accueil&nbsp;».
          </span>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      className="w-full text-xs h-9"
      onClick={handleInstall}
    >
      <Download className="h-3.5 w-3.5 mr-1" />
      Installer l&apos;application
    </Button>
  );
}

// ─── Type declarations ───────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
