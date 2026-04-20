'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Lucide icons
import {
  Store,
  QrCode,
  Download,
  Copy,
  BarChart3,
  CreditCard,
  Phone,
  MessageCircle,
  Globe,
  Tag,
  CalendarClock,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  Loader2,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface MerchantDashboardProps {
  merchantId: string;
  merchantName: string;
  stationId: string;
  stationName: string;
}

interface Merchant {
  id: string;
  stationId: string;
  name: string;
  description: string | null;
  category: string;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  offerText: string | null;
  offerCode: string | null;
  contactUrl: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { qrScans: number; offers: number };
  offers: Array<{ id: string; title: string; isActive: boolean }>;
}

interface OfferFormState {
  name: string;
  description: string;
  category: string;
  phone: string;
  contactUrl: string;
  offerText: string;
  offerCode: string;
  logoUrl: string;
  imageUrl: string;
}

const EMPTY_FORM: OfferFormState = {
  name: '',
  description: '',
  category: 'GENERAL',
  phone: '',
  contactUrl: '',
  offerText: '',
  offerCode: '',
  logoUrl: '',
  imageUrl: '',
};

// ============================================================
// Category Config
// ============================================================

const categoryConfig: Record<string, { label: string; icon: React.ElementType; colorClass: string; bgClass: string }> = {
  RESTAURANT: { label: 'Restaurant', icon: () => <span>🍽️</span>, colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20' },
  TAXI: { label: 'Taxi', icon: () => <span>🚕</span>, colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20' },
  HOTEL: { label: 'Hôtel', icon: () => <span>🏨</span>, colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20' },
  SHOP: { label: 'Boutique', icon: () => <span>🛍️</span>, colorClass: 'text-sky-400', bgClass: 'bg-sky-500/20' },
  SERVICE: { label: 'Service', icon: () => <span>🔧</span>, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20' },
  TRANSPORT: { label: 'Transport', icon: () => <span>🚌</span>, colorClass: 'text-cyan-400', bgClass: 'bg-cyan-500/20' },
  GENERAL: { label: 'Général', icon: () => <span>🏪</span>, colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20' },
};

// ============================================================
// Tab transition variant
// ============================================================

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
};

// ============================================================
// Main Component
// ============================================================

export function MerchantDashboard({ merchantId, merchantName, stationId, stationName }: MerchantDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch merchant data - get all for station then filter by merchantId
  const { data: merchants, isLoading } = useQuery<Merchant[]>({
    queryKey: ['merchants', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants?stationId=${stationId}`);
      if (!res.ok) throw new Error('Failed to fetch merchant');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 30000,
  });

  const merchant = merchants?.find((m) => m.id === merchantId) ?? null;

  return (
    <div className="w-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Store className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{merchantName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Store className="w-3 h-3" />
              Tableau de bord commerçant — <span className="font-semibold text-emerald-500">{stationName}</span>
            </p>
          </div>
        </div>
        {merchant && (
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium gap-1.5',
              merchant.isActive
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-slate-400 border-slate-500/30 bg-slate-500/10',
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                merchant.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500',
              )}
            />
            {merchant.isActive ? 'En ligne' : 'Hors ligne'}
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
        <div className="w-full overflow-x-auto -mb-px">
          <TabsList className="w-full sm:w-auto inline-flex h-auto sm:h-9 p-1 gap-1 bg-muted/50">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vue d&apos;ensemble</span>
              <span className="sm:hidden">Vue</span>
            </TabsTrigger>
            <TabsTrigger value="offer" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mon Offre</span>
              <span className="sm:hidden">Offre</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">QR &amp; Partage</span>
              <span className="sm:hidden">QR</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <TrendingUp className="w-3.5 h-3.5" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="renewal" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-none">
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Renouvellement</span>
              <span className="sm:hidden">Renouv.</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <Separator className="mt-0" />

        {/* Tab Content with AnimatePresence */}
        <div className="flex-1 min-h-0 mt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <OverviewTab merchant={merchant} isLoading={isLoading} merchantName={merchantName} />
              </motion.div>
            )}
            {activeTab === 'offer' && (
              <motion.div key="offer" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <OfferTab merchant={merchant} merchantId={merchantId} />
              </motion.div>
            )}
            {activeTab === 'qr' && (
              <motion.div key="qr" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <QrTab merchantId={merchantId} merchantName={merchantName} stationId={stationId} />
              </motion.div>
            )}
            {activeTab === 'stats' && (
              <motion.div key="stats" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <StatsTab merchant={merchant} isLoading={isLoading} />
              </motion.div>
            )}
            {activeTab === 'renewal' && (
              <motion.div key="renewal" variants={tabVariants} initial="initial" animate="animate" exit="exit">
                <RenewalTab merchant={merchant} isLoading={isLoading} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}

// ============================================================
// Overview Tab
// ============================================================

function OverviewTab({
  merchant,
  isLoading,
  merchantName,
}: {
  merchant: Merchant | null;
  isLoading: boolean;
  merchantName: string;
}) {
  const statCards = [
    {
      title: 'Scans QR',
      value: merchant?._count.qrScans ?? 0,
      icon: QrCode,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      sub: 'Total depuis la création',
    },
    {
      title: 'Offres actives',
      value: merchant?.offers?.filter((o) => o.isActive).length ?? 0,
      icon: Tag,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      sub: `${merchant?._count.offers ?? 0} offre(s) au total`,
    },
    {
      title: 'Statut',
      value: merchant?.isActive ? 'Actif' : 'Inactif',
      icon: merchant?.isActive ? CheckCircle2 : AlertTriangle,
      color: merchant?.isActive ? 'text-emerald-400' : 'text-amber-400',
      bgColor: merchant?.isActive ? 'bg-emerald-500/10' : 'bg-amber-500/10',
      borderColor: merchant?.isActive ? 'border-emerald-500/20' : 'border-amber-500/20',
      sub: merchant?.isActive ? 'Visible sur le kiosk' : 'Non visible',
    },
    {
      title: 'Membre depuis',
      value: merchant?.createdAt
        ? new Date(merchant.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
      icon: CalendarClock,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      sub: merchant?.updatedAt
        ? `Mis à jour le ${new Date(merchant.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
        : '',
    },
  ];

  const categoryInfo = merchant ? categoryConfig[merchant.category] || categoryConfig.GENERAL : categoryConfig.GENERAL;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-emerald-500/20 bg-emerald-500/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-lg font-bold text-white">
                Bienvenue, <span className="text-emerald-400">{merchantName}</span> 👋
              </h3>
              <p className="text-sm text-slate-400 max-w-xl">
                Gérez votre présence dans la gare depuis ce tableau de bord. Modifiez vos informations,
                partagez votre QR code, et suivez vos statistiques.
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <Badge
                  className={cn('text-xs font-medium', categoryInfo.bgClass, categoryInfo.colorClass)}
                >
                  {categoryInfo.label}
                </Badge>
                {merchant?.offerCode && (
                  <Badge className="bg-amber-500/10 text-amber-500 text-xs font-mono gap-1">
                    <Tag className="w-3 h-3" />
                    {merchant.offerCode}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : statCards.map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn('border', card.borderColor, 'bg-slate-900 overflow-hidden')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                        <p className={cn('text-2xl font-bold tabular-nums truncate', card.color)}>
                          {typeof card.value === 'string' ? (
                            <span className="text-lg">{card.value}</span>
                          ) : (
                            card.value
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
                      </div>
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', card.bgColor)}>
                        <card.icon className={cn('w-5 h-5', card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Quick Info */}
      {merchant && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {merchant.phone ? (
                <p className="text-sm text-slate-300 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {merchant.phone}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">Aucun téléphone renseigné</p>
              )}
              {merchant.contactUrl ? (
                <p className="text-sm text-slate-300 flex items-center gap-2 truncate">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="truncate">{merchant.contactUrl}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">Aucun WhatsApp renseigné</p>
              )}
              {merchant.website ? (
                <p className="text-sm text-slate-300 flex items-center gap-2 truncate">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{merchant.website}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">Aucun site web renseigné</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                Offre actuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {merchant.offerText ? (
                <div className="space-y-2">
                  <p className="text-sm text-white font-medium">{merchant.offerText}</p>
                  {merchant.offerCode && (
                    <Badge className="bg-amber-500/10 text-amber-500 text-sm font-mono px-3 py-1">
                      {merchant.offerCode}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs text-slate-500">Aucune offre configurée</p>
                  <p className="text-xs text-slate-600 mt-1">Rendez-vous dans l&apos;onglet &quot;Mon Offre&quot;</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Offer Tab — Edit merchant information
// ============================================================

function OfferTab({ merchant, merchantId }: { merchant: Merchant | null; merchantId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OfferFormState>(EMPTY_FORM);
  const [syncedId, setSyncedId] = useState<string | null>(null);

  // Sync form with merchant data during render (not in effect)
  if (merchant && syncedId !== merchant.id) {
    setSyncedId(merchant.id);
    setForm({
      name: merchant.name || '',
      description: merchant.description || '',
      category: merchant.category || 'GENERAL',
      phone: merchant.phone || '',
      contactUrl: merchant.contactUrl || '',
      offerText: merchant.offerText || '',
      offerCode: merchant.offerCode || '',
      logoUrl: merchant.logoUrl || '',
      imageUrl: merchant.imageUrl || '',
    });
  }

  const updateField = (key: keyof OfferFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: OfferFormState) => {
      const res = await fetch('/api/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: merchantId,
          name: data.name,
          description: data.description || null,
          category: data.category,
          phone: data.phone || null,
          contactUrl: data.contactUrl || null,
          offerText: data.offerText || null,
          offerCode: data.offerCode || null,
          logoUrl: data.logoUrl || null,
          imageUrl: data.imageUrl || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast.success('Informations mises à jour avec succès');
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    updateMutation.mutate(form);
  };

  if (!merchant) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity Section */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            Identité
          </CardTitle>
          <CardDescription className="text-slate-400">
            Informations principales de votre commerce
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="md-name" className="text-slate-300">
                Nom <span className="text-red-400">*</span>
              </Label>
              <Input
                id="md-name"
                placeholder="Chez Tonton"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-category" className="text-slate-300">
                Catégorie
              </Label>
              <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="RESTAURANT">🍽️ Restaurant</SelectItem>
                  <SelectItem value="TAXI">🚕 Taxi</SelectItem>
                  <SelectItem value="HOTEL">🏨 Hôtel</SelectItem>
                  <SelectItem value="SHOP">🛍️ Boutique</SelectItem>
                  <SelectItem value="SERVICE">🔧 Service</SelectItem>
                  <SelectItem value="TRANSPORT">🚌 Transport</SelectItem>
                  <SelectItem value="GENERAL">🏪 Général</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="md-desc" className="text-slate-300">
              Description
            </Label>
            <textarea
              id="md-desc"
              placeholder="Décrivez votre activité..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              maxLength={300}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-slate-500 text-right">{form.description.length}/300</p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            Contact
          </CardTitle>
          <CardDescription className="text-slate-400">
            Comment les voyageurs peuvent vous joindre
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="md-phone" className="text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Téléphone
              </Label>
              <Input
                id="md-phone"
                placeholder="+221 77 123 45 67"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-whatsapp" className="text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                WhatsApp URL
              </Label>
              <Input
                id="md-whatsapp"
                placeholder="https://wa.me/221771234567"
                value={form.contactUrl}
                onChange={(e) => updateField('contactUrl', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Section */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-400" />
            Offre spéciale
          </CardTitle>
          <CardDescription className="text-slate-400">
            Définissez une offre ou un code promo visible par les voyageurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="md-offer" className="text-slate-300">
                Texte de l&apos;offre
              </Label>
              <Input
                id="md-offer"
                placeholder="-10% pour les voyageurs"
                value={form.offerText}
                onChange={(e) => updateField('offerText', e.target.value)}
                maxLength={80}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-code" className="text-slate-300">
                Code promo
              </Label>
              <Input
                id="md-code"
                placeholder="GARE10"
                value={form.offerCode}
                onChange={(e) => updateField('offerCode', e.target.value)}
                maxLength={20}
                className="bg-slate-800 border-slate-700 text-white font-mono uppercase"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Section */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            Médias
          </CardTitle>
          <CardDescription className="text-slate-400">
            URLs de votre logo et image (hébergement externe)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="md-logo" className="text-slate-300">
                URL du logo
              </Label>
              <Input
                id="md-logo"
                placeholder="https://example.com/logo.png"
                value={form.logoUrl}
                onChange={(e) => updateField('logoUrl', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
              />
              {form.logoUrl && (
                <div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-slate-800">
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="w-10 h-10 rounded object-cover border border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-slate-400 truncate">{form.logoUrl}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="md-image" className="text-slate-300">
                URL de l&apos;image
              </Label>
              <Input
                id="md-image"
                placeholder="https://example.com/photo.jpg"
                value={form.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
              />
              {form.imageUrl && (
                <div className="mt-2 p-2 rounded-lg bg-slate-800 overflow-hidden">
                  <img
                    src={form.imageUrl}
                    alt="Image preview"
                    className="w-full h-16 rounded object-cover border border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSyncedId(null);
            setForm(EMPTY_FORM);
          }}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Réinitialiser
        </Button>
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// QR Code & Sharing Tab
// ============================================================

function QrTab({
  merchantId,
  merchantName,
  stationId,
}: {
  merchantId: string;
  merchantName: string;
  stationId: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const publicUrl = `/p/${stationId}/${merchantId}`;
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${publicUrl}` : publicUrl;

  // Generate QR code
  useEffect(() => {
    let cancelled = false;
    async function generateQR() {
      try {
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(publicUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }
    generateQR();
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('URL copiée dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier l\'URL');
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = qrDataUrl.replace('image/png', 'image/octet-stream');
    downloadLink.download = `QR-${merchantName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('QR Code téléchargé');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Votre QR Code
            </CardTitle>
            <CardDescription className="text-slate-400">
              Les voyageurs scannent ce code pour voir votre page
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-2xl flex flex-col items-center gap-4 shadow-lg">
              {isLoading ? (
                <div className="w-[280px] h-[280px] flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code - ${merchantName}`}
                  className="w-[280px] h-[280px] rounded-xl"
                  width={280}
                  height={280}
                />
              ) : (
                <Skeleton className="w-[280px] h-[280px] rounded-xl" />
              )}
              <div className="text-center">
                <p className="text-slate-900 font-bold text-base">{merchantName}</p>
                <p className="text-slate-500 text-xs break-all max-w-[250px] font-mono">{publicUrl}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5 w-full">
              <Button
                onClick={downloadQR}
                disabled={!qrDataUrl}
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="w-4 h-4" />
                Télécharger le QR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sharing Card */}
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-sky-400" />
              Partager
            </CardTitle>
            <CardDescription className="text-slate-400">
              Partagez votre page publique avec les voyageurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Public URL */}
            <div className="space-y-2">
              <Label className="text-slate-300">Lien public</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={publicUrl}
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                />
                <Button
                  onClick={copyUrl}
                  variant="outline"
                  size="icon"
                  className={cn(
                    'shrink-0 transition-colors',
                    copied
                      ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800',
                  )}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Usage Tips */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Idées d&apos;utilisation
              </h4>
              <div className="space-y-2">
                {[
                  {
                    icon: <Store className="w-4 h-4 text-emerald-400" />,
                    title: 'Dans votre boutique',
                    desc: 'Affichez le QR code à la caisse ou à l\'entrée',
                  },
                  {
                    icon: <Wifi className="w-4 h-4 text-sky-400" />,
                    title: 'Sur vos réseaux sociaux',
                    desc: 'Partagez le lien sur WhatsApp, Facebook, Instagram',
                  },
                  {
                    icon: <MessageCircle className="w-4 h-4 text-emerald-500" />,
                    title: 'Via WhatsApp Business',
                    desc: 'Envoyez votre lien directement à vos clients',
                  },
                  {
                    icon: <Tag className="w-4 h-4 text-amber-400" />,
                    title: 'Sur vos flyers',
                    desc: 'Imprimez le QR code sur vos supports papier',
                  },
                ].map((tip) => (
                  <div key={tip.title} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50">
                    <div className="mt-0.5">{tip.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{tip.title}</p>
                      <p className="text-xs text-slate-400">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Stats Tab — Mock statistics
// ============================================================

function StatsTab({ merchant, isLoading }: { merchant: Merchant | null; isLoading: boolean }) {
  // Simulate weekly scan data
  const weeklyData = [
    { day: 'Lun', scans: 12 },
    { day: 'Mar', scans: 8 },
    { day: 'Mer', scans: 15 },
    { day: 'Jeu', scans: 22 },
    { day: 'Ven', scans: 35 },
    { day: 'Sam', scans: 48 },
    { day: 'Dim', scans: 19 },
  ];

  const maxScans = Math.max(...weeklyData.map((d) => d.scans));
  const totalWeek = weeklyData.reduce((acc, d) => acc + d.scans, 0);
  const totalMonth = totalWeek * 4;
  const mostPopularDay = weeklyData.reduce((prev, curr) => (curr.scans > prev.scans ? curr : prev));

  const statCards = [
    {
      title: 'Scans cette semaine',
      value: totalWeek,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      sub: '+18% vs semaine dernière',
      trend: 'up' as const,
    },
    {
      title: 'Scans ce mois',
      value: totalMonth,
      icon: BarChart3,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      sub: `Moy. ${Math.round(totalMonth / 30)}/jour`,
      trend: 'up' as const,
    },
    {
      title: 'Jour le plus populaire',
      value: mostPopularDay.day,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      sub: `${mostPopularDay.scans} scans`,
      trend: 'neutral' as const,
    },
    {
      title: 'Taux de conversion',
      value: '34%',
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      sub: 'Estimé (données simulées)',
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Note about mock data */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-400">Données simulées</p>
          <p className="text-xs text-slate-400 mt-1">
            Les statistiques affichées sont des données de démonstration. Les vraies données seront disponibles
            une fois le système d&apos;analytique activé.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : statCards.map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn('border', card.borderColor, 'bg-slate-900 overflow-hidden')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                        <p className={cn('text-2xl font-bold tabular-nums', card.color)}>
                          {typeof card.value === 'number' ? card.value : card.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{card.sub}</p>
                      </div>
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', card.bgColor)}>
                        <card.icon className={cn('w-5 h-5', card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {/* Weekly Chart */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Scans par jour
              </CardTitle>
              <CardDescription className="text-slate-400">
                Répartition des scans QR sur la semaine
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs gap-1">
              <RefreshCw className="w-3 h-3" />
              Simulé
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 sm:gap-4 h-48">
            {weeklyData.map((d) => {
              const heightPercent = maxScans > 0 ? (d.scans / maxScans) * 100 : 0;
              const isTop = d.day === mostPopularDay.day;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-mono tabular-nums text-slate-400">{d.scans}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: weeklyData.indexOf(d) * 0.05 }}
                    className={cn(
                      'w-full rounded-t-lg min-h-[4px] transition-colors',
                      isTop
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : 'bg-slate-700 hover:bg-slate-600',
                    )}
                  />
                  <span className={cn('text-xs font-medium', isTop ? 'text-emerald-400' : 'text-slate-500')}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Renewal Tab — Subscription & Payment
// ============================================================

function RenewalTab({ merchant, isLoading }: { merchant: Merchant | null; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);

  // Compute subscription status based on createdAt
  const getSubscriptionStatus = () => {
    if (!merchant) return { status: 'unknown', label: 'Inconnu', colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20' };

    const created = new Date(merchant.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    // Simulate a 30-day cycle
    const daysInCycle = daysSinceCreation % 30;
    const daysRemaining = 30 - daysInCycle;

    if (daysRemaining <= 5) {
      return {
        status: 'expiring',
        label: 'Expire bientôt',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-500/20',
        daysRemaining,
      };
    }
    return {
      status: 'active',
      label: 'Actif',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/20',
      daysRemaining,
    };
  };

  const subStatus = getSubscriptionStatus();

  const getNextBillingDate = () => {
    if (!merchant) return '—';
    const created = new Date(merchant.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = 30 - (daysSinceCreation % 30);
    const nextBilling = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
    return nextBilling.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleRenewal = async () => {
    if (!selectedPayment) {
      toast.error('Veuillez choisir une méthode de paiement');
      return;
    }
    setRenewing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    toast.success('Renouvellement effectué avec succès ! (simulation)');
    setRenewing(false);
    setSelectedPayment(null);
    queryClient.invalidateQueries({ queryKey: ['merchants'] });
  };

  const paymentMethods = [
    {
      id: 'orange-money',
      name: 'Orange Money',
      icon: '🟠',
      description: 'Paiement mobile via Orange Money',
      color: 'border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/5',
    },
    {
      id: 'wave',
      name: 'Wave',
      icon: '🔵',
      description: 'Paiement mobile via Wave',
      color: 'border-sky-500/30 hover:border-sky-500/60 hover:bg-sky-500/5',
    },
    {
      id: 'carte',
      name: 'Carte bancaire',
      icon: '💳',
      description: 'Visa, Mastercard via Stripe',
      color: 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card
        className={cn(
          'border overflow-hidden',
          subStatus.status === 'expiring' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5',
        )}
      >
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br pointer-events-none',
          subStatus.status === 'expiring'
            ? 'from-amber-500/10 via-transparent to-transparent'
            : 'from-emerald-500/10 via-transparent to-transparent',
        )} />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-4">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0', subStatus.bgClass)}>
              {subStatus.status === 'expiring' ? (
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              ) : (
                <Shield className="w-7 h-7 text-emerald-400" />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Abonnement
                <Badge className={cn('text-xs', subStatus.bgClass, subStatus.colorClass)}>
                  {subStatus.label}
                </Badge>
              </h3>
              <p className="text-sm text-slate-400">
                {subStatus.status === 'expiring'
                  ? `Votre abonnement expire dans ${subStatus.daysRemaining} jour(s). Renouvelez pour rester visible.`
                  : `Votre abonnement est actif. Prochain renouvellement automatique dans ${subStatus.daysRemaining} jour(s).`}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Plan Marketplace</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Prochain paiement : {getNextBillingDate()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Montant mensuel</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">5 000 <span className="text-sm text-slate-500">FCFA</span></p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Prochain paiement</p>
            <p className="text-lg font-bold text-sky-400 mt-1">{getNextBillingDate()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Jours restants</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums mt-1',
              subStatus.daysRemaining !== undefined && subStatus.daysRemaining <= 5
                ? 'text-amber-400'
                : 'text-emerald-400',
            )}>
              {subStatus.daysRemaining ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Selection */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Renouveler maintenant
          </CardTitle>
          <CardDescription className="text-slate-400">
            Choisissez votre méthode de paiement préférée
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {paymentMethods.map((method) => (
              <button
                type="button"
                key={method.id}
                onClick={() => setSelectedPayment(method.id === selectedPayment ? null : method.id)}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 rounded-xl border transition-all text-center',
                  selectedPayment === method.id
                    ? method.color
                    : 'border-slate-700 hover:border-slate-600 bg-slate-800/50',
                )}
              >
                <span className="text-2xl">{method.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{method.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{method.description}</p>
                </div>
                {selectedPayment === method.id && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleRenewal}
              disabled={!selectedPayment || renewing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[180px]"
            >
              {renewing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Payer 5 000 FCFA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History placeholder */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-400" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-400">Aucun historique de paiement</p>
            <p className="text-xs text-slate-500 mt-1">Les paiements apparaîtront ici après le premier renouvellement</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
