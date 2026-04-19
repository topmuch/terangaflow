'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CreditCard,
  Check,
  Zap,
  Store,
  Bell,
  Palette,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Types ──────────────────────────────────────────────────────────

interface BillingSubscription {
  id: string;
  stationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  planType: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionResponse {
  success: boolean;
  data: BillingSubscription | null;
}

interface CheckoutResponse {
  url: string | null;
  demo?: boolean;
  message?: string;
}

// ── Plan definitions ───────────────────────────────────────────────

interface PlanFeature {
  text: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  features: PlanFeature[];
}

const plans: Plan[] = [
  {
    id: 'analytics',
    name: 'Analytics Premium',
    price: 49,
    priceId: 'price_analytics_premium',
    description: 'Access dashboards analytiques avances',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    features: [
      { text: 'Tableaux de bord en temps reel' },
      { text: 'Statistiques par ligne et par heure' },
      { text: 'Export CSV et PDF' },
      { text: 'Alertes automatiques' },
    ],
  },
  {
    id: 'marketplace',
    name: 'Marketplace Partenaire',
    price: 29,
    priceId: 'price_marketplace_partenaire',
    description: 'Gerez vos commerces et partenaires',
    icon: <Store className="h-6 w-6" />,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    features: [
      { text: 'Gestion des marchands locaux' },
      { text: 'Offres et codes promotionnels' },
      { text: 'QR codes personnalises' },
      { text: 'Suivi des conversions' },
    ],
  },
  {
    id: 'push_pack',
    name: 'Push Pack',
    price: 19,
    priceId: 'price_push_pack',
    description: 'Notifications push illimitees',
    icon: <Bell className="h-6 w-6" />,
    color: 'text-sky-400',
    borderColor: 'border-sky-500/30',
    features: [
      { text: 'Notifications illimitees' },
      { text: 'Campagnes ciblees par ligne' },
      { text: 'Schemas de retard et annulation' },
      { text: 'Statistiques de delivery' },
    ],
  },
  {
    id: 'white_label',
    name: 'White Label',
    price: 99,
    priceId: 'price_white_label',
    description: 'Marque blanche complete + domaine personnalise',
    icon: <Palette className="h-6 w-6" />,
    color: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    features: [
      { text: 'Logo et couleurs personnalises' },
      { text: 'Domaine personnalise (votre-gare.sn)' },
      { text: 'Page de connexion personnalisee' },
      { text: 'Support prioritaire 24/7' },
    ],
  },
];

// ── Animation variants ─────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
};

// ── Component ──────────────────────────────────────────────────────

interface BillingSectionProps {
  stationId: string;
}

export default function BillingSection({ stationId }: BillingSectionProps) {
  // Fetch current subscription
  const { data: subData, isLoading: subLoading } = useQuery<SubscriptionResponse>({
    queryKey: ['stripe-subscription', stationId],
    queryFn: async () => {
      const res = await fetch(
        `/api/stripe/subscription?stationId=${stationId}`
      );
      if (!res.ok) throw new Error('Erreur de chargement');
      return res.json();
    },
  });

  // Checkout mutation
  const checkoutMutation = useMutation<
    CheckoutResponse,
    Error,
    { stationId: string; planType: string; priceId: string }
  >({
    mutationFn: async (variables) => {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      if (!res.ok) throw new Error('Erreur lors de la creation de la session');
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else if (data.demo) {
        toast.info(data.message || 'Mode demo — Stripe non configure');
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const activePlan = subData?.data?.planType ?? null;
  const subStatus = subData?.data?.status ?? null;

  function handleSubscribe(plan: Plan) {
    checkoutMutation.mutate({
      stationId,
      planType: plan.id,
      priceId: plan.priceId,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
          <CreditCard className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            Abonnements & Facturation
          </h2>
          <p className="text-sm text-slate-400">
            Gerez vos plans Stripe et consultez vos factures
          </p>
        </div>
      </div>

      {/* Current subscription banner */}
      {activePlan && subStatus && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                Plan actif : {plans.find((p) => p.id === activePlan)?.name}
              </span>
            </div>
            <Badge
              variant="outline"
              className="border-emerald-500/50 text-emerald-400"
            >
              {subStatus === 'active' ? 'Actif' : subStatus}
            </Badge>
          </div>
        </motion.div>
      )}

      {/* Loading state */}
      {subLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      )}

      {/* Plan cards grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {plans.map((plan, index) => {
          const isActive = activePlan === plan.id;
          const isSubscribing =
            checkoutMutation.isPending &&
            checkoutMutation.variables?.planType === plan.id;

          return (
            <motion.div
              key={plan.id}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Card
                className={`bg-slate-900 border ${
                  isActive
                    ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                    : plan.borderColor
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 ${plan.color}`}
                      >
                        {plan.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">
                          {plan.name}
                        </CardTitle>
                        <p className="text-xs text-slate-400">
                          {plan.description}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-400"
                      >
                        Actif
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">
                      {plan.price}€
                    </span>
                    <span className="text-sm text-slate-500">/mois</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.text}
                        className="flex items-center gap-2 text-sm text-slate-300"
                      >
                        <Check className="h-4 w-4 shrink-0 text-slate-500" />
                        {feature.text}
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe button */}
                  <Button
                    className={`w-full ${
                      isActive
                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-800 cursor-default'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                    disabled={isActive || isSubscribing}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : isActive ? (
                      'Plan actuel'
                    ) : (
                      "S'abonner"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
