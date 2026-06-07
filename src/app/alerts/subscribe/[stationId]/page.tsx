"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Bell,
  BellRing,
  Shield,
  Check,
  X,
  MessageSquare,
  Smartphone,
  Wifi,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePushSubscription } from "@/hooks/usePushSubscription";

// ─── RGPD Compliance Points ─────────────────────────────────────────────────

const RGPD_POINTS = [
  {
    title: "Données minimales",
    description: "Nous ne collectons que les informations nécessaires pour envoyer les notifications.",
  },
  {
    title: "Objectif clair",
    description: "Les notifications servent uniquement à informer des changements de départs à votre gare.",
  },
  {
    title: "Droit de retrait",
    description: "Vous pouvez vous désabonner à tout moment depuis les paramètres.",
  },
  {
    title: "Aucun suivi",
    description: "Pas de tracking, pas de revente de données à des tiers.",
  },
];

// ─── Alert Type Options ──────────────────────────────────────────────────────

const ALERT_OPTIONS = [
  {
    id: "boarding",
    label: "Embarquement ouvert",
    description: "Soyez alerté quand votre trajet ouvre l'embarquement",
    icon: "🚌",
    defaultEnabled: true,
  },
  {
    id: "delay",
    label: "Retard signalé",
    description: "Recevez une alerte en cas de retard de votre trajet",
    icon: "⏰",
    defaultEnabled: true,
  },
  {
    id: "cancellation",
    label: "Annulation",
    description: "Notification immédiate en cas d'annulation",
    icon: "🚫",
    defaultEnabled: true,
  },
  {
    id: "promotion",
    label: "Offres & Promotions",
    description: "Recevez les offres des partenaires de la gare (optionnel)",
    icon: "🏷️",
    defaultEnabled: false,
  },
];

// ─── RGPD Opt-in Page ────────────────────────────────────────────────────────

export default function AlertsSubscribePage() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.stationId as string;

  const push = usePushSubscription();

  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(
    () => new Set(ALERT_OPTIONS.filter((a) => a.defaultEnabled).map((a) => a.id))
  );
  const [rgpdConsent, setRgpdConsent] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const toggleAlert = (id: string) => {
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubscribe = async () => {
    if (!rgpdConsent || selectedAlerts.size === 0) return;

    await push.subscribe(stationId);

    if (push.isSubscribed) {
      setIsComplete(true);
    }
  };

  // ─── Success State ────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-bounce">
                <Check className="h-8 w-8" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold">Notifications activées !</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Vous recevrez désormais les alertes en temps réel pour votre gare.
                Vous pouvez modifier vos préférences à tout moment.
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Alerts activées :
              </p>
              {Array.from(selectedAlerts).map((id) => {
                const option = ALERT_OPTIONS.find((a) => a.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <span>{option?.icon}</span>
                    <span>{option?.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push("/pwa")} className="w-full">
                Aller à l&apos;accueil
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/pwa/profile")}
                className="w-full"
              >
                Gérer mes préférences
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Opt-in Form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Alertes en temps réel</h1>
            <p className="text-sm text-white/80">Gare Centrale de Dakar</p>
          </div>
        </div>
        <p className="text-sm text-white/90 leading-relaxed">
          Ne manquez plus jamais votre départ. Recevez des notifications
          instantanées pour les changements de trajets.
        </p>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5 max-w-lg mx-auto w-full">
        {/* Alert type selection */}
        <section>
          <h2 className="text-sm font-semibold mb-3">
            Quelles alertes souhaitez-vous recevoir ?
          </h2>
          <div className="space-y-2">
            {ALERT_OPTIONS.map((option) => (
              <Card
                key={option.id}
                className={`overflow-hidden cursor-pointer transition-all ${
                  selectedAlerts.has(option.id)
                    ? "border-amber-500/50 bg-amber-50/30 dark:bg-amber-500/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => toggleAlert(option.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="text-xl shrink-0">{option.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium">{option.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                  <Checkbox
                    checked={selectedAlerts.has(option.id)}
                    onCheckedChange={() => toggleAlert(option.id)}
                    aria-label={option.label}
                    className="shrink-0"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* RGPD consent */}
        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Protection de vos données
          </h2>

          <Card className="overflow-hidden border-blue-200 dark:border-blue-500/30">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                {RGPD_POINTS.map((point) => (
                  <div key={point.title} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{point.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {point.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={rgpdConsent}
                    onCheckedChange={(checked) => setRgpdConsent(checked as boolean)}
                    className="mt-0.5 shrink-0"
                  />
                  <span className="text-xs leading-relaxed">
                    J&apos;accepte de recevoir des notifications push de TerangaFlow
                    conformément à la politique de confidentialité. Je comprends
                    que je peux me désabonner à tout moment.
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SMS fallback */}
        <section>
          <Card className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="h-4 w-4 shrink-0" />
                <span>
                  Push non disponible ?{" "}
                  <a
                    href="#"
                    className="text-amber-600 dark:text-amber-400 underline"
                  >
                    Recevez les alertes par SMS (optionnel)
                  </a>
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Subscribe button */}
        <Button
          size="lg"
          className="w-full h-12 text-sm gap-2"
          disabled={
            !rgpdConsent ||
            selectedAlerts.size === 0 ||
            push.isLoading
          }
          onClick={handleSubscribe}
        >
          {push.isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Activation…
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Activer les notifications
            </>
          )}
        </Button>

        {push.error && (
          <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 text-center">
            {push.error}
          </div>
        )}

        <div className="text-center pb-4">
          <a
            href="/pwa"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour sans activer les notifications
          </a>
        </div>
      </div>
    </div>
  );
}
