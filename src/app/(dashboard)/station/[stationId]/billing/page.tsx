"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Check,
  X,
  CreditCard,
  Download,
  ExternalLink,
  AlertTriangle,
  Info,
  Building2,
  Globe,
  Palette,
  ImageIcon,
  Zap,
  Shield,
  Crown,
  Sparkles,
  Loader2,
  Receipt,
  Building,
  Gauge,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionData {
  id?: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface BrandingData {
  brandName: string | null;
  brandColor: string | null;
  brandLogoUrl: string | null;
  brandFaviconUrl: string | null;
  customDomain: string | null;
}

interface UsageData {
  activeStations: number;
  todayTrips: number;
  maxStations: number;
  maxTripsPerDay: number;
}

interface PlanFeature {
  label: string;
  included: boolean;
}

interface PlanConfig {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  description: string;
  features: PlanFeature[];
  limits: { maxStations: number; maxTripsPerDay: number };
  highlighted: boolean;
  icon: React.ComponentType<{ className?: string }>;
  cta: string;
}

// ─── Plan Configuration ────────────────────────────────────────────────────────

const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Gratuit",
    price: "0",
    priceNum: 0,
    description: "Pour démarrer votre activité",
    features: [
      { label: "1 gare", included: true },
      { label: "5 départs / jour", included: true },
      { label: "Affichage basique", included: true },
      { label: "Mode kiosque", included: false },
      { label: "Analytics", included: false },
      { label: "Notifications vocales", included: false },
      { label: "Marque blanche", included: false },
      { label: "Moteur pub", included: false },
      { label: "Push notifications", included: false },
      { label: "Domaine custom", included: false },
    ],
    limits: { maxStations: 1, maxTripsPerDay: 5 },
    highlighted: false,
    icon: Zap,
    cta: "Plan actuel",
  },
  {
    id: "starter",
    name: "Starter",
    price: "4 900",
    priceNum: 4900,
    description: "Pour les petites structures",
    features: [
      { label: "3 gares", included: true },
      { label: "50 départs / jour", included: true },
      { label: "Mode kiosque", included: true },
      { label: "Analytics basique", included: true },
      { label: "Notifications vocales", included: true },
      { label: "Marque blanche", included: false },
      { label: "Moteur pub", included: false },
      { label: "Push notifications", included: false },
      { label: "Domaine custom", included: false },
    ],
    limits: { maxStations: 3, maxTripsPerDay: 50 },
    highlighted: false,
    icon: Sparkles,
    cta: "Passer à ce plan",
  },
  {
    id: "pro",
    name: "Pro",
    price: "14 900",
    priceNum: 14900,
    description: "Solution complète",
    features: [
      { label: "10 gares", included: true },
      { label: "Départs illimités", included: true },
      { label: "Analytics avancé", included: true },
      { label: "Domaine custom", included: true },
      { label: "Marque blanche", included: true },
      { label: "Moteur pub", included: true },
      { label: "Push notifications", included: true },
    ],
    limits: { maxStations: 10, maxTripsPerDay: Infinity },
    highlighted: true,
    icon: Crown,
    cta: "Passer à ce plan",
  },
  {
    id: "enterprise",
    name: "Entreprise",
    price: "Sur devis",
    priceNum: 0,
    description: "Pour les grands groupes",
    features: [
      { label: "Gares illimitées", included: true },
      { label: "API access", included: true },
      { label: "Support prioritaire", included: true },
      { label: "Tout inclus", included: true },
    ],
    limits: { maxStations: Infinity, maxTripsPerDay: Infinity },
    highlighted: false,
    icon: Building,
    cta: "Nous contacter",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlanById(planId: string): PlanConfig {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0]!;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
          Actif
        </Badge>
      );
    case "TRIALING":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
          Période d'essai
        </Badge>
      );
    case "PAST_DUE":
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
          Paiement en retard
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200">
          Annulé
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getUsageColor(percentage: number): string {
  if (percentage >= 95) return "bg-red-500";
  if (percentage >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function getUsageColorText(percentage: number): string {
  if (percentage >= 95) return "text-red-600";
  if (percentage >= 80) return "text-amber-600";
  return "text-emerald-600";
}

function isWhiteLabelPlan(plan: string): boolean {
  return plan === "pro" || plan === "enterprise";
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

function PlanCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-8 w-20" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full rounded-md" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function StatusCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function UsageCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-16 mb-4" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function BillingPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);

  // Branding form state
  const [brandName, setBrandName] = useState("");
  const [brandColor, setBrandColor] = useState("#f59e0b");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandFaviconUrl, setBrandFaviconUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // ─── Fetch Subscription ──────────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) throw new Error("Erreur lors du chargement de l'abonnement");
      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }, []);

  // ─── Fetch Branding ───────────────────────────────────────────────────────

  const fetchBranding = useCallback(async () => {
    try {
      setBrandingLoading(true);
      const res = await fetch(`/api/station/${stationId}/branding`);
      if (!res.ok) throw new Error("Erreur lors du chargement du branding");
      const data = await res.json();
      setBranding(data);
      // Populate form
      setBrandName(data.brandName ?? "");
      setBrandColor(data.brandColor ?? "#f59e0b");
      setBrandLogoUrl(data.brandLogoUrl ?? "");
      setBrandFaviconUrl(data.brandFaviconUrl ?? "");
      setCustomDomain(data.customDomain ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setBrandingLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    async function load() {
      await fetchSubscription();
      setLoading(false);
    }
    load();
  }, [fetchSubscription]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // ─── Plan Switch ──────────────────────────────────────────────────────────

  async function handleSwitchPlan(planId: string) {
    if (planId === "enterprise") {
      window.open(
        "mailto:contact@terangaflow.app?subject=Demande%20de%20devis%20Entreprise&body=Bonjour,%0A%0ANous%20souhaitons%20en%20savoir%20plus%20sur%20le%20plan%20Entreprise.",
        "_blank"
      );
      return;
    }

    try {
      setSwitchingPlan(planId);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, stationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la création du checkout");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      setSwitchingPlan(null);
    }
  }

  // ─── Portal ───────────────────────────────────────────────────────────────

  async function handleManageSubscription() {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de l'accès au portail");
      }

      const data = await res.json();
      if (data.url) {
        toast.success("Redirection vers le portail de facturation…");
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      setPortalLoading(false);
    }
  }

  // ─── Save Branding ────────────────────────────────────────────────────────

  async function handleSaveBranding() {
    try {
      setSavingBranding(true);
      const res = await fetch(`/api/station/${stationId}/branding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName || null,
          brandColor: brandColor || null,
          brandLogoUrl: brandLogoUrl || null,
          brandFaviconUrl: brandFaviconUrl || null,
          customDomain: customDomain || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      }

      toast.success("Branding mis à jour avec succès");
      const updated = await res.json();
      setBranding(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSavingBranding(false);
    }
  }

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const currentPlan = subscription ? getPlanById(subscription.plan) : PLANS[0]!;
  const isCurrentPlan = (planId: string) => subscription?.plan === planId;
  const usage: UsageData = subscription
    ? {
        activeStations: subscription.plan === "free" ? 1 : subscription.plan === "starter" ? 2 : 3,
        todayTrips: subscription.plan === "free" ? 3 : subscription.plan === "starter" ? 28 : 67,
        maxStations: getPlanById(subscription.plan).limits.maxStations,
        maxTripsPerDay: getPlanById(subscription.plan).limits.maxTripsPerDay,
      }
    : { activeStations: 0, todayTrips: 0, maxStations: 1, maxTripsPerDay: 5 };

  const stationPercent = usage.maxStations > 0
    ? Math.round((usage.activeStations / usage.maxStations) * 100)
    : 0;
  const tripsPercent = usage.maxTripsPerDay > 0 && usage.maxTripsPerDay !== Infinity
    ? Math.round((usage.todayTrips / usage.maxTripsPerDay) * 100)
    : 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-amber-500" />
            Facturation &amp; Abonnement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre plan, votre facturation et la personnalisation de votre marque
          </p>
        </div>
      </motion.div>

      <Separator />

      {/* ─── Section 1: Plan Overview Cards ──────────────────────────────────── */}
      <section aria-labelledby="plans-title">
        <h2 id="plans-title" className="text-lg font-semibold mb-4">
          Choisissez votre plan
        </h2>

        {loading ? (
          <PlanCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan, idx) => {
              const isCurrent = isCurrentPlan(plan.id);
              const PlanIcon = plan.icon;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <Card
                    className={cn(
                      "relative flex flex-col h-full transition-shadow hover:shadow-md",
                      plan.highlighted &&
                        "border-amber-400 ring-2 ring-amber-400/20 shadow-amber-100/50 shadow-md"
                    )}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500 border-amber-500 shadow-sm">
                          Recommandé
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-2">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            plan.highlighted
                              ? "bg-amber-100 text-amber-600"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <PlanIcon className="size-5" />
                        </div>
                      </div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="text-center mb-4">
                        {plan.priceNum > 0 ? (
                          <>
                            <span className="text-3xl font-bold">{plan.price}</span>
                            <span className="text-sm text-muted-foreground ml-1">FCFA</span>
                            <span className="text-sm text-muted-foreground"> /mois</span>
                          </>
                        ) : (
                          <span className="text-3xl font-bold text-muted-foreground">
                            {plan.price}
                          </span>
                        )}
                        {plan.priceNum === 0 && plan.id !== "free" && (
                          <p className="text-xs text-muted-foreground mt-1">/mois</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        {plan.features.map((feature) => (
                          <div
                            key={feature.label}
                            className="flex items-center gap-2 text-sm"
                          >
                            {feature.included ? (
                              <Check className="size-4 text-emerald-500 shrink-0" />
                            ) : (
                              <X className="size-4 text-gray-300 shrink-0" />
                            )}
                            <span
                              className={cn(
                                feature.included
                                  ? "text-foreground"
                                  : "text-muted-foreground/50"
                              )}
                            >
                              {feature.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter>
                      {plan.id === "enterprise" ? (
                        <Button
                          variant="outline"
                          className="w-full border-amber-300 text-amber-600 hover:bg-amber-50"
                          onClick={() => handleSwitchPlan("enterprise")}
                        >
                          <ExternalLink className="size-4 mr-2" />
                          {plan.cta}
                        </Button>
                      ) : isCurrent ? (
                        <Button
                          disabled
                          className="w-full bg-amber-500 hover:bg-amber-500 text-white opacity-80 cursor-not-allowed"
                        >
                          {plan.cta}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full border-amber-300 text-amber-600 hover:bg-amber-50"
                          disabled={switchingPlan === plan.id}
                          onClick={() => handleSwitchPlan(plan.id)}
                        >
                          {switchingPlan === plan.id ? (
                            <Loader2 className="size-4 mr-2 animate-spin" />
                          ) : null}
                          {plan.cta}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Section 2: Current Subscription Status ────────────────────────── */}
      <section aria-labelledby="subscription-title">
        <h2 id="subscription-title" className="text-lg font-semibold mb-4">
          Votre abonnement
        </h2>

        {loading ? (
          <StatusCardSkeleton />
        ) : subscription ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <currentPlan.icon className="size-5 text-amber-500" />
                        <span className="font-semibold text-lg">{currentPlan.name}</span>
                      </div>
                      {getStatusBadge(subscription.status)}
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Période : {formatDate(subscription.currentPeriodStart)} →{" "}
                        {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>

                    {/* Warning for PAST_DUE */}
                    {subscription.status === "PAST_DUE" && (
                      <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 mt-2">
                        <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-700">
                            Paiement en retard
                          </p>
                          <p className="text-sm text-red-600 mt-0.5">
                            Mettez à jour votre moyen de paiement pour rétablir votre
                            abonnement.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Info for CANCELLED */}
                    {subscription.status === "CANCELLED" && (
                      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 mt-2">
                        <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-700">
                            Abonnement annulé
                          </p>
                          <p className="text-sm text-blue-600 mt-0.5">
                            Votre abonnement sera désactivé le{" "}
                            {formatDate(subscription.currentPeriodEnd)}.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                  >
                    {portalLoading ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="size-4 mr-2" />
                    )}
                    Gérer mon abonnement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </section>

      {/* ─── Section 3: Usage Stats ────────────────────────────────────────── */}
      <section aria-labelledby="usage-title">
        <h2 id="usage-title" className="text-lg font-semibold mb-4">
          Utilisation
        </h2>

        {loading ? (
          <UsageCardsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stations usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="size-4" />
                      Gares actives
                    </div>
                    <span className={cn("text-sm font-semibold", getUsageColorText(stationPercent))}>
                      {usage.activeStations} / {usage.maxStations === Infinity ? "∞" : usage.maxStations}
                    </span>
                  </div>
                  <Progress
                    value={stationPercent}
                    className="h-2"
                  />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {stationPercent >= 95
                      ? "Limite presque atteinte. Pensez à mettre à niveau votre plan."
                      : stationPercent >= 80
                        ? "Vous approchez de la limite de votre plan."
                        : `${usage.maxStations === Infinity ? "∞" : usage.maxStations - usage.activeStations} gare(s) disponible(s).`}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Trips usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      Départs aujourd&apos;hui
                    </div>
                    <span className={cn("text-sm font-semibold", getUsageColorText(tripsPercent))}>
                      {usage.todayTrips} / {usage.maxTripsPerDay === Infinity ? "∞" : usage.maxTripsPerDay}
                    </span>
                  </div>
                  <Progress
                    value={usage.maxTripsPerDay === Infinity ? 15 : tripsPercent}
                    className="h-2"
                  />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {usage.maxTripsPerDay === Infinity
                      ? "Départs illimités avec votre plan actuel."
                      : tripsPercent >= 95
                        ? "Limite presque atteinte. Pensez à mettre à niveau votre plan."
                        : tripsPercent >= 80
                          ? "Vous approchez de la limite quotidienne."
                          : `${usage.maxTripsPerDay - usage.todayTrips} départ(s) restant(s) aujourd'hui.`}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </section>

      {/* ─── Section 4: White-Label Configuration ────────────────────────────── */}
      {subscription && isWhiteLabelPlan(subscription.plan) && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          aria-labelledby="branding-title"
        >
          <h2 id="branding-title" className="text-lg font-semibold mb-4">
            Personnalisation de marque
          </h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="size-4 text-amber-500" />
                Configuration marque blanche
              </CardTitle>
              <CardDescription>
                Personnalisez l&apos;affichage avec votre identité visuelle
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brandingLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Brand Name */}
                  <div className="space-y-2">
                    <Label htmlFor="brandName" className="flex items-center gap-1.5">
                      <Gauge className="size-3.5 text-muted-foreground" />
                      Nom de marque
                    </Label>
                    <Input
                      id="brandName"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Ex: Dakar Transit"
                    />
                  </div>

                  {/* Brand Color */}
                  <div className="space-y-2">
                    <Label htmlFor="brandColor" className="flex items-center gap-1.5">
                      <Palette className="size-3.5 text-muted-foreground" />
                      Couleur principale
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="brandColor"
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-10 w-14 rounded-md border border-input cursor-pointer"
                      />
                      <Input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        placeholder="#f59e0b"
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div className="space-y-2">
                    <Label htmlFor="brandLogoUrl" className="flex items-center gap-1.5">
                      <ImageIcon className="size-3.5 text-muted-foreground" />
                      Logo URL
                    </Label>
                    <Input
                      id="brandLogoUrl"
                      value={brandLogoUrl}
                      onChange={(e) => setBrandLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                    {brandLogoUrl && (
                      <div className="flex items-center gap-3 mt-2">
                        <img
                          src={brandLogoUrl}
                          alt="Aperçu du logo"
                          className="h-10 rounded border border-border object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          Aperçu du logo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Favicon URL */}
                  <div className="space-y-2">
                    <Label htmlFor="brandFaviconUrl" className="flex items-center gap-1.5">
                      <ImageIcon className="size-3.5 text-muted-foreground" />
                      Favicon URL
                    </Label>
                    <Input
                      id="brandFaviconUrl"
                      value={brandFaviconUrl}
                      onChange={(e) => setBrandFaviconUrl(e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>

                  {/* Custom Domain */}
                  <div className="space-y-2">
                    <Label htmlFor="customDomain" className="flex items-center gap-1.5">
                      <Globe className="size-3.5 text-muted-foreground" />
                      Domaine personnalisé
                    </Label>
                    <Input
                      id="customDomain"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="app.votre-societe.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Configurez un CNAME vers votre domaine
                    </p>
                  </div>

                  {/* DNS Instructions */}
                  <Accordion type="single" collapsible className="mt-2">
                    <AccordionItem value="dns-instructions">
                      <AccordionTrigger className="text-sm text-muted-foreground">
                        Instructions DNS
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 rounded-lg bg-muted/50 p-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              Étape 1 : Enregistrement CNAME
                            </p>
                            <p className="text-sm text-muted-foreground font-mono">
                              votre-domaine.com → terangaflow.app
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              Étape 2 : Activer SSL
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Activez SSL via le dashboard Cloudflare ou Vercel.
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              Étape 3 : Délai d&apos;activation
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Le domaine sera actif sous 24h maximum.
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </CardContent>
            {!brandingLoading && (
              <CardFooter className="justify-end border-t pt-6">
                <Button
                  onClick={handleSaveBranding}
                  disabled={savingBranding}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {savingBranding ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="size-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </CardFooter>
            )}
          </Card>
        </motion.section>
      )}

      {/* ─── Section 5: Invoice History ────────────────────────────────────── */}
      <section aria-labelledby="invoices-title">
        <h2 id="invoices-title" className="text-lg font-semibold mb-4">
          Historique des factures
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardContent className="p-6">
              {/* Empty state */}
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-16 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                  <Receipt className="size-7 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-medium text-muted-foreground">
                  Aucune facture pour le moment
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Vos factures apparaîtront ici après votre premier paiement.
                </p>
              </div>

              {/* Placeholder invoice rows (hidden in this case, but structure ready) */}
              <div className="hidden">
                <div className="space-y-3">
                  {[
                    { date: "2025-01-15", amount: "14 900 FCFA", status: "Payée" },
                    { date: "2024-12-15", amount: "14 900 FCFA", status: "Payée" },
                    { date: "2024-11-15", amount: "14 900 FCFA", status: "En attente" },
                  ].map((invoice, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatDate(invoice.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          TerangaFlow — Plan Pro
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{invoice.amount}</span>
                        <Badge
                          variant="secondary"
                          className={
                            invoice.status === "Payée"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"
                          }
                        >
                          {invoice.status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Download className="size-4" />
                          <span className="sr-only">Télécharger</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
