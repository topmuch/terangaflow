'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Store,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  QrCode,
  MapPin,
  Mail,
  Phone,
  Globe,
  ImageIcon,
  Camera,
  Tag,
  CreditCard,
  Bus,
  Sparkles,
  Shield,
  Clock,
  Download,
} from 'lucide-react';

/* ============================================================
   TYPES & CONSTANTS
   ============================================================ */

interface Station {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  _count: { merchants: number };
}

interface FormData {
  // Step 1
  stationId: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  // Step 2
  description: string;
  logoUrl: string;
  imageUrl: string;
  contactUrl: string;
  // Step 3
  offerText: string;
  offerCode: string;
  plan: 'FREE' | 'WELCOME_PACK';
  paymentMethod: 'orange_money' | 'wave' | 'carte_bancaire' | '';
}

const INITIAL_FORM: FormData = {
  stationId: '',
  name: '',
  category: '',
  email: '',
  phone: '',
  description: '',
  logoUrl: '',
  imageUrl: '',
  contactUrl: '',
  offerText: '',
  offerCode: '',
  plan: 'FREE',
  paymentMethod: '',
};

const CATEGORIES = [
  { value: 'RESTAURANT', emoji: '🍴', label: 'Restaurant' },
  { value: 'TAXI', emoji: '🚕', label: 'Taxi' },
  { value: 'HOTEL', emoji: '🏨', label: 'Hôtel' },
  { value: 'SHOP', emoji: '🛍️', label: 'Boutique' },
  { value: 'SERVICE', emoji: '🔧', label: 'Service' },
  { value: 'TRANSPORT', emoji: '🚌', label: 'Transport' },
  { value: 'GENERAL', emoji: '🏪', label: 'Général' },
];

const STEPS = [
  { number: 1, label: 'Identité', icon: Store },
  { number: 2, label: 'Présentation', icon: Camera },
  { number: 3, label: 'Offre & Abonnement', icon: Tag },
];

const PAYMENT_METHODS = [
  {
    id: 'orange_money' as const,
    label: 'Orange Money',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    bgColor: 'bg-orange-50',
    icon: '📱',
    description: 'Paiement mobile Orange Money',
  },
  {
    id: 'wave' as const,
    label: 'Wave',
    color: 'bg-sky-500',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-300',
    bgColor: 'bg-sky-50',
    icon: '💰',
    description: 'Paiement mobile Wave',
  },
  {
    id: 'carte_bancaire' as const,
    label: 'Carte bancaire',
    color: 'bg-slate-600',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
    bgColor: 'bg-slate-50',
    icon: '💳',
    description: 'Visa, Mastercard...',
  },
];

/* ============================================================
   ANIMATION VARIANTS
   ============================================================ */

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  return /^\+?\d{8,15}$/.test(cleaned);
}

function validateStep1(form: FormData): string | null {
  if (!form.stationId) return 'Veuillez sélectionner une gare';
  if (!form.name.trim()) return 'Le nom de votre commerce est requis';
  if (!form.category) return 'Veuillez choisir une catégorie';
  if (!form.email.trim()) return "L'email est requis";
  if (!validateEmail(form.email)) return "Format d'email invalide";
  if (!form.phone.trim()) return 'Le numéro de téléphone est requis';
  if (!validatePhone(form.phone)) return 'Format de téléphone invalide (ex: +221 77 123 45 67)';
  return null;
}

function validateStep2(_form: FormData): string | null {
  // All fields optional in step 2
  return null;
}

function validateStep3(form: FormData): string | null {
  if (form.plan === 'WELCOME_PACK' && !form.paymentMethod) {
    return 'Veuillez choisir une méthode de paiement';
  }
  return null;
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function MerchantRegisterPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registeredMerchant, setRegisteredMerchant] = useState<{
    id: string;
    stationId: string;
    name: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Fetch stations
  useEffect(() => {
    let cancelled = false;
    async function fetchStations() {
      try {
        const res = await fetch('/api/stations/public');
        const json = await res.json();
        if (!cancelled && json.success) {
          setStations(json.data);
        }
      } catch {
        if (!cancelled) toast.error('Erreur lors du chargement des gares');
      } finally {
        if (!cancelled) setLoadingStations(false);
      }
    }
    fetchStations();
    return () => {
      cancelled = true;
    };
  }, []);

  // Generate QR code after successful registration
  const generateQR = useCallback(
    async (merchantId: string, stationId: string) => {
      try {
        const publicUrl = `/p/${stationId}/${merchantId}`;
        const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${publicUrl}` : publicUrl;
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(fullUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(dataUrl);
      } catch {
        // QR generation is non-critical
      }
    },
    [],
  );

  const updateField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const goNext = () => {
    let error: string | null = null;
    if (step === 1) error = validateStep1(form);
    else if (step === 2) error = validateStep2(form);
    else if (step === 3) error = validateStep3(form);

    if (error) {
      toast.error(error);
      return;
    }

    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const error = validateStep3(form);
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/merchants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: form.stationId,
          name: form.name.trim(),
          category: form.category,
          email: form.email.trim(),
          phone: form.phone.trim(),
          description: form.description.trim() || undefined,
          logoUrl: form.logoUrl.trim() || undefined,
          imageUrl: form.imageUrl.trim() || undefined,
          contactUrl: form.contactUrl.trim() || undefined,
          offerText: form.offerText.trim() || undefined,
          offerCode: form.offerCode.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Erreur lors de l'inscription");
        setSubmitting(false);
        return;
      }

      const merchant = json.data;
      setRegisteredMerchant({
        id: merchant.id,
        stationId: merchant.stationId,
        name: merchant.name,
      });

      // Generate QR
      generateQR(merchant.id, merchant.stationId);

      toast.success('Inscription enregistrée avec succès !');
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = (step / 3) * 100;

  /* ============================================================
     SUCCESS SCREEN
     ============================================================ */
  if (registeredMerchant) {
    const publicUrl = `/p/${registeredMerchant.stationId}/${registeredMerchant.id}`;

    const downloadQR = () => {
      if (!qrDataUrl) return;
      const downloadLink = document.createElement('a');
      downloadLink.href = qrDataUrl.replace('image/png', 'image/octet-stream');
      downloadLink.download = `QR-${registeredMerchant.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('QR Code téléchargé');
    };

    return (
      <motion.div
        variants={successVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen flex items-center justify-center p-4 sm:p-8"
      >
        <Card className="w-full max-w-lg border-0 shadow-2xl shadow-emerald-500/10 bg-white">
          <CardContent className="p-8 sm:p-10 text-center space-y-6">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                Inscription enregistrée !
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Votre demande est en cours de validation{' '}
                <span className="font-semibold text-emerald-600">(24h max)</span>
              </p>
            </motion.div>

            {/* QR Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white border-2 border-slate-100 rounded-2xl p-6 inline-flex flex-col items-center mx-auto"
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code de votre page publique"
                  className="w-[200px] h-[200px] rounded-xl"
                  width={200}
                  height={200}
                />
              ) : (
                <div className="w-[200px] h-[200px] rounded-xl bg-slate-100 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400 font-mono break-all max-w-[220px]">
                {publicUrl}
              </p>
              {qrDataUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQR}
                  className="mt-3 gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le QR
                </Button>
              )}
            </motion.div>

            {/* Info Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-3 text-left"
            >
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <Mail className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-800">
                  Vous recevrez un email de confirmation sous 24h
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <Clock className="w-4.5 h-4.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  Votre commerce sera visible sur les écrans après validation
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 border border-sky-100">
                <QrCode className="w-4.5 h-4.5 text-sky-600 mt-0.5 shrink-0" />
                <p className="text-sm text-sky-800">
                  Partagez votre QR code dès maintenant pour préparer votre arrivée
                </p>
              </div>
            </motion.div>

            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="mt-4 text-slate-500 hover:text-slate-700"
            >
              Retour à l&apos;accueil
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  /* ============================================================
     REGISTRATION FORM
     ============================================================ */
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">TerangaFlow</span>
          </div>
          <Badge variant="outline" className="text-xs font-medium text-emerald-600 border-emerald-200 bg-emerald-50 hidden sm:inline-flex">
            <Sparkles className="w-3 h-3 mr-1" />
            Inscription commerçant
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          {/* Step Indicator */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((s, i) => (
                <div key={s.number} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                        step > s.number
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : step === s.number
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/20'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {step > s.number ? (
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <span className="text-sm sm:text-base font-bold">{s.number}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        step >= s.number ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-12 sm:w-20 h-0.5 mx-2 sm:mx-4 rounded-full transition-colors duration-500 ${
                        step > s.number ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500" />
          </div>

          {/* Form Card */}
          <Card className="border-slate-200/80 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {/* ── STEP 1: Identity ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <Store className="w-5 h-5 text-emerald-500" />
                      Votre commerce
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      Renseignez les informations de base de votre activité
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pb-6">
                    {/* Station */}
                    <div className="space-y-2">
                      <Label htmlFor="station" className="text-sm font-medium text-slate-700">
                        <MapPin className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" />
                        Gare <span className="text-red-500">*</span>
                      </Label>
                      {loadingStations ? (
                        <div className="h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center px-3">
                          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        </div>
                      ) : stations.length === 0 ? (
                        <div className="h-9 rounded-md border border-amber-200 bg-amber-50 flex items-center px-3 text-sm text-amber-600">
                          Aucune gare disponible
                        </div>
                      ) : (
                        <Select value={form.stationId} onValueChange={(v) => updateField('stationId', v)}>
                          <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-slate-900 h-11">
                            <SelectValue placeholder="Sélectionnez votre gare" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            {stations.map((station) => (
                              <SelectItem key={station.id} value={station.id}>
                                <span className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-medium">{station.name}</span>
                                  <span className="text-slate-400 text-xs">
                                    ({station.city}, {station.country})
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Business Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                        Nom du commerce <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Chez Tonton, Le Relais..."
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11"
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        Catégorie <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => updateField('category', cat.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                              form.category === cat.value
                                ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                                : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                            }`}
                          >
                            <span className="text-2xl">{cat.emoji}</span>
                            <span
                              className={`text-xs font-medium ${
                                form.category === cat.value ? 'text-emerald-700' : 'text-slate-600'
                              }`}
                            >
                              {cat.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                          <Mail className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" />
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@exemple.com"
                          value={form.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                          <Phone className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" />
                          Téléphone <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+221 77 123 45 67"
                          value={form.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11"
                        />
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              )}

              {/* ── STEP 2: Presentation ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-emerald-500" />
                      Présentation
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      Ajoutez du contenu visuel pour attirer les voyageurs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pb-6">
                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                        Description de votre activité
                      </Label>
                      <textarea
                        id="description"
                        placeholder="Décrivez votre commerce en quelques mots..."
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        rows={3}
                        maxLength={300}
                        className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all"
                      />
                      <p className="text-xs text-slate-400 text-right">
                        {form.description.length}/300
                      </p>
                    </div>

                    {/* Logo URL */}
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl" className="text-sm font-medium text-slate-700">
                        <ImageIcon className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" />
                        URL du logo
                      </Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://exemple.com/logo.png"
                        value={form.logoUrl}
                        onChange={(e) => updateField('logoUrl', e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 font-mono text-xs"
                      />
                      {form.logoUrl && (
                        <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              src={form.logoUrl}
                              alt="Aperçu du logo"
                              className="w-10 h-10 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML =
                                  '<span class="text-slate-300 text-xs">?</span>';
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 truncate font-mono">
                            {form.logoUrl}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Photo URL */}
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="text-sm font-medium text-slate-700">
                        <Camera className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" />
                        URL de la photo
                      </Label>
                      <Input
                        id="imageUrl"
                        placeholder="https://exemple.com/photo.jpg"
                        value={form.imageUrl}
                        onChange={(e) => updateField('imageUrl', e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 font-mono text-xs"
                      />
                      {form.imageUrl && (
                        <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                          <img
                            src={form.imageUrl}
                            alt="Aperçu de la photo"
                            className="w-full h-32 sm:h-40 rounded-lg object-cover border border-slate-200"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = 'none';
                              if (el.parentElement) {
                                el.parentElement.innerHTML =
                                  '<div class="w-full h-32 sm:h-40 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-sm">Image non disponible</div>';
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Contact URL */}
                    <div className="space-y-2">
                      <Label htmlFor="contactUrl" className="text-sm font-medium text-slate-700">
                        <Globe className="w-3.5 h-3.5 inline mr-1.5 text-emerald-500" />
                        WhatsApp ou site web
                      </Label>
                      <Input
                        id="contactUrl"
                        placeholder="https://wa.me/221771234567"
                        value={form.contactUrl}
                        onChange={(e) => updateField('contactUrl', e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 font-mono text-xs"
                      />
                      <p className="text-xs text-slate-400">
                        Entrez un lien WhatsApp ou l&apos;URL de votre site web
                      </p>
                    </div>
                  </CardContent>
                </motion.div>
              )}

              {/* ── STEP 3: Offer & Subscription ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-emerald-500" />
                      Offre &amp; Abonnement
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      Définissez votre offre spéciale et choisissez votre plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pb-6">
                    {/* Offer */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Offre spéciale pour les voyageurs
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="offerText" className="text-sm font-medium text-slate-600">
                            Texte de l&apos;offre
                          </Label>
                          <Input
                            id="offerText"
                            placeholder="-10% pour les voyageurs"
                            value={form.offerText}
                            onChange={(e) => updateField('offerText', e.target.value)}
                            maxLength={80}
                            className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="offerCode" className="text-sm font-medium text-slate-600">
                            Code promo
                          </Label>
                          <Input
                            id="offerCode"
                            placeholder="GARE10"
                            value={form.offerCode}
                            onChange={(e) => updateField('offerCode', e.target.value.toUpperCase())}
                            maxLength={20}
                            className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 font-mono uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      {/* Plan Selection */}
                      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        Choisissez votre plan
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* FREE Plan */}
                        <button
                          type="button"
                          onClick={() => {
                            updateField('plan', 'FREE');
                            updateField('paymentMethod', '');
                          }}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                            form.plan === 'FREE'
                              ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                              : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                          }`}
                        >
                          {form.plan === 'FREE' && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <p className="text-base font-bold text-slate-900 mb-1">Gratuit</p>
                          <p className="text-2xl font-extrabold text-emerald-600">0 FCFA</p>
                          <p className="text-xs text-slate-500 mt-1">Visibilité basique sur les écrans</p>
                        </button>

                        {/* WELCOME_PACK Plan */}
                        <button
                          type="button"
                          onClick={() => updateField('plan', 'WELCOME_PACK')}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                            form.plan === 'WELCOME_PACK'
                              ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
                              : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                          }`}
                        >
                          {form.plan === 'WELCOME_PACK' && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-bold text-slate-900">Welcome Pack</p>
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5 py-0">
                              Populaire
                            </Badge>
                          </div>
                          <p className="text-2xl font-extrabold text-emerald-600">
                            9 900 <span className="text-sm font-medium text-slate-500">FCFA/mois</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            QR Code, offres, statistiques avancées
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Payment Method (only for WELCOME_PACK) */}
                    <AnimatePresence>
                      {form.plan === 'WELCOME_PACK' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
                              <Shield className="w-4 h-4 text-emerald-500" />
                              Méthode de paiement
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {PAYMENT_METHODS.map((method) => (
                                <button
                                  key={method.id}
                                  type="button"
                                  onClick={() => updateField('paymentMethod', method.id)}
                                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 cursor-pointer ${
                                    form.paymentMethod === method.id
                                      ? `${method.borderColor} ${method.bgColor} shadow-md`
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <span className="text-3xl block mb-2">{method.icon}</span>
                                  <p
                                    className={`text-sm font-bold ${
                                      form.paymentMethod === method.id
                                        ? method.textColor
                                        : 'text-slate-700'
                                    }`}
                                  >
                                    {method.label}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {method.description}
                                  </p>
                                  {form.paymentMethod === method.id && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="mt-2 mx-auto w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                                    >
                                      <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="text-slate-600 border-slate-200 hover:bg-slate-100 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  onClick={goNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20 px-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      S&apos;inscrire
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3" />
            Vos données sont protégées et ne seront jamais partagées sans votre consentement
          </p>
        </div>
      </main>
    </div>
  );
}
