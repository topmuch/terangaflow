'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Store, Utensils, Bed, Car, ShoppingBag, Wrench, Bus, ChevronRight, ChevronLeft,
  Check, Loader2, Upload, Image, Phone, MessageCircle, Gift, Sparkles, ArrowRight,
  MapPin, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================
// Types
// ============================================================

interface Station {
  id: string;
  name: string;
  code: string;
  city: string;
}

interface MerchantRegisterProps {
  onComplete?: (merchantId: string) => void;
  onBack?: () => void;
  standalone?: boolean;
}

const categories = [
  { value: 'RESTAURANT', label: '🍴 Restaurant', icon: Utensils },
  { value: 'HOTEL', label: '🏨 Hôtel / Auberge', icon: Bed },
  { value: 'TAXI', label: '🚕 Taxi', icon: Car },
  { value: 'SHOP', label: '🛍️ Boutique', icon: ShoppingBag },
  { value: 'SERVICE', label: '🔧 Service', icon: Wrench },
  { value: 'TRANSPORT', label: '🚌 Transport', icon: Bus },
  { value: 'GENERAL', label: '🏪 Autre', icon: Store },
];

// ============================================================
// Main Component
// ============================================================

export function MerchantRegisterForm({ onComplete, onBack, standalone }: MerchantRegisterProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Business Info
  const [form, setForm] = useState({
    stationId: '',
    name: '',
    category: 'RESTAURANT',
    description: '',
    phone: '',
    email: '',
  });

  // Step 2: Visual
  const [visual, setVisual] = useState({
    logoUrl: '',
    imageUrl: '',
  });

  // Step 3: Offer
  const [offer, setOffer] = useState({
    offerText: '',
    offerCode: '',
    contactUrl: '',
  });

  // Fetch stations
  const { data: stationsData, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['stations-public'],
    queryFn: async () => {
      const res = await fetch('/api/stations/public');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      return json.data;
    },
  });
  const stations = stationsData || [];

  // Set default station when available (via query data initialization)
  const stationId = form.stationId || (stations.length > 0 ? stations[0].id : '');

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/merchants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, stationId, ...visual, ...offer }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (data) => {
      toast.success('Inscription réussie ! 🎉');
      if (onComplete) onComplete(data.id);
      else {
        setStep(4); // Success step
      }
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const handleSubmit = () => {
    if (!form.name || !stationId) {
      toast.error('Nom du commerce et gare requis');
      return;
    }
    registerMutation.mutate();
  };

  const nextStep = () => {
    if (step === 1 && (!form.name || !stationId)) {
      toast.error('Remplissez le nom et sélectionnez une gare');
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const updateForm = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const updateVisual = (key: string, value: string) =>
    setVisual((prev) => ({ ...prev, [key]: value }));
  const updateOffer = (key: string, value: string) =>
    setOffer((prev) => ({ ...prev, [key]: value }));

  // Generate WhatsApp URL from phone
  const generateWhatsAppUrl = () => {
    if (form.phone) {
      const cleanPhone = form.phone.replace(/\s/g, '');
      const prefix = cleanPhone.startsWith('221') ? '' : '221';
      updateOffer('contactUrl', `https://wa.me/${prefix}${cleanPhone}`);
    }
  };

  const containerClass = standalone
    ? 'min-h-screen bg-[#0B0F19] text-white'
    : '';

  return (
    <div className={containerClass}>
      <div className={standalone ? 'min-h-screen flex items-center justify-center p-4' : ''}>
        <div className={`w-full ${standalone ? 'max-w-lg' : ''}`}>
          {/* Progress Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-slate-400 hover:text-white -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
              )}
              <div className="flex items-center gap-2 flex-1 justify-center">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step >= s
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {step > s ? <Check className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`w-8 h-0.5 transition-all ${
                          step > s ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="w-16" />
            </div>
            <p className="text-center text-xs text-slate-500">
              Étape {step} sur 3 —{' '}
              {step === 1 && 'Informations du commerce'}
              {step === 2 && 'Logo & Photos'}
              {step === 3 && 'Offre promo'}
            </p>
          </div>

          {/* Steps Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                    <Store className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Inscrivez votre commerce</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Rejoignez la marketplace de votre gare
                  </p>
                </div>

                {/* Station Select */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
                    Gare <span className="text-red-400">*</span>
                  </Label>
                  {stationsLoading ? (
                    <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
                  ) : (
                    <Select value={stationId} onValueChange={(v) => updateForm('stationId', v)}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Sélectionnez une gare" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-white">
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Nom du commerce <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="Restaurant Le Terminus"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Catégorie</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => {
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => updateForm('category', cat.value)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                            form.category === cat.value
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <CatIcon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{cat.label.replace(/^[^\s]+ /, '')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Description courte</Label>
                  <textarea
                    placeholder="Cuisine sénégalaise traditionnelle, spécialité thiéboudienne..."
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      <Phone className="w-3.5 h-3.5 inline mr-1" />
                      Téléphone
                    </Label>
                    <Input
                      placeholder="+221 77 123 45 67"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      placeholder="contact@terminus.sn"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <Button onClick={nextStep} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5">
                  Continuer
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-3">
                    <Camera className="w-7 h-7 text-violet-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Logo & Photos</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Ajoutez votre logo et une photo de votre établissement
                  </p>
                </div>

                {/* Logo URL */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    <Image className="w-3.5 h-3.5 inline mr-1.5" />
                    URL du Logo
                  </Label>
                  <Input
                    placeholder="https://exemple.com/logo.png"
                    value={visual.logoUrl}
                    onChange={(e) => updateVisual('logoUrl', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  {visual.logoUrl && (
                    <div className="flex items-center gap-3 mt-2 p-3 bg-slate-800 rounded-lg">
                      <img
                        src={visual.logoUrl}
                        alt="Logo preview"
                        className="w-12 h-12 rounded-lg object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-xs text-emerald-400 font-medium">Logo détecté ✓</span>
                    </div>
                  )}
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                    URL de la Photo (établissement)
                  </Label>
                  <Input
                    placeholder="https://exemple.com/photo-restaurant.jpg"
                    value={visual.imageUrl}
                    onChange={(e) => updateVisual('imageUrl', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  {visual.imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-700">
                      <img
                        src={visual.imageUrl}
                        alt="Photo preview"
                        className="w-full h-40 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>

                <Card className="bg-slate-800/50 border-slate-700/50 p-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <Sparkles className="w-3.5 h-3.5 inline text-amber-400 mr-1" />
                    <strong className="text-slate-300">Conseil :</strong> Une photo de qualité attire plus de voyageurs. 
                    Utilisez une image lumineuse montrant votre établissement.
                  </p>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Retour
                  </Button>
                  <Button onClick={nextStep} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    Continuer
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-7 h-7 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Offre Promotionnelle</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Créez une offre pour attirer les voyageurs
                  </p>
                </div>

                {/* Offer Text */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Texte de l&apos;offre
                  </Label>
                  <Input
                    placeholder="-10% sur votre repas avec ce code"
                    value={offer.offerText}
                    onChange={(e) => updateOffer('offerText', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Offer Code */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Code promo
                  </Label>
                  <Input
                    placeholder="GARE10"
                    value={offer.offerCode}
                    onChange={(e) => updateOffer('offerCode', e.target.value.toUpperCase())}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono uppercase"
                  />
                </div>

                {/* WhatsApp / Contact URL */}
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    <MessageCircle className="w-3.5 h-3.5 inline mr-1.5" />
                    Lien WhatsApp / Contact
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://wa.me/221771234567"
                      value={offer.contactUrl}
                      onChange={(e) => updateOffer('contactUrl', e.target.value)}
                      className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    {form.phone && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={generateWhatsAppUrl}
                        className="shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10"
                        title="Générer depuis le téléphone"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preview Card */}
                {offer.offerText && (
                  <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 p-4">
                    <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">
                      Aperçu de votre offre
                    </p>
                    <div className="bg-white rounded-xl p-4 text-center">
                      <p className="font-bold text-slate-800">{form.name}</p>
                      <p className="text-amber-600 font-extrabold text-lg mt-2">{offer.offerText}</p>
                      {offer.offerCode && (
                        <div className="mt-2 inline-block bg-amber-50 px-3 py-1 rounded-lg border-2 border-dashed border-amber-300 font-mono text-amber-700 font-bold">
                          {offer.offerCode}
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Price */}
                <Card className="bg-emerald-500/10 border-emerald-500/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Pack Bienvenue</p>
                      <p className="text-2xl font-extrabold text-white mt-1">5 000 FCFA<span className="text-sm text-slate-400 font-normal">/mois</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">QR Code personnalisé</p>
                      <p className="text-xs text-slate-400">Page mobile brandée</p>
                      <p className="text-xs text-slate-400">Statistiques</p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Retour
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={registerMutation.isPending || !form.name}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        Inscription...
                      </>
                    ) : (
                      <>
                        Confirmer
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white">Bienvenue ! 🎉</h2>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Votre inscription a été soumise avec succès. L&apos;équipe TerangaFlow va valider votre compte sous 24h.
                </p>
                <div className="bg-slate-800 rounded-xl p-4 text-left space-y-2">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ce qui arrive ensuite :</p>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    Génération de votre QR code personnalisé
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    Activation sur l&apos;écran de la gare
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    Email de bienvenue avec guide
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    Accès à votre dashboard marchand
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (onBack) onBack();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Retour à l&apos;accueil
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
