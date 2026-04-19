'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import {
  Globe,
  Palette,
  ExternalLink,
  Info,
  Save,
  Loader2,
  Eye,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface StationBranding {
  id: string;
  name: string;
  customDomain: string | null;
  brandLogo: string | null;
  brandColor: string;
  companyName: string;
  isWhiteLabel: boolean;
}

interface DraftState {
  customDomain: string;
  companyName: string;
  brandColor: string;
  brandLogo: string;
  isWhiteLabel: boolean;
}

const defaultDraft: DraftState = {
  customDomain: '',
  companyName: 'SmartTicketQR',
  brandColor: '#10b981',
  brandLogo: '',
  isWhiteLabel: false,
};

interface WhiteLabelSectionProps {
  stationId: string;
}

// ============================================================
// Component
// ============================================================

export function WhiteLabelSection({ stationId }: WhiteLabelSectionProps) {
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);

  // Draft state: null means "use server values"; set when user edits
  const [draft, setDraft] = useState<DraftState | null>(null);

  // ---- Fetch branding ----
  const { data: branding, isLoading } = useQuery<StationBranding>({
    queryKey: ['station-branding', stationId],
    queryFn: async () => {
      const res = await fetch(
        `/api/stations/branding?stationId=${stationId}`
      );
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // Derive current values from branding (no effect needed)
  const current: DraftState = draft ?? (branding
    ? {
        customDomain: branding.customDomain ?? '',
        companyName: branding.companyName ?? 'SmartTicketQR',
        brandColor: branding.brandColor ?? '#10b981',
        brandLogo: branding.brandLogo ?? '',
        isWhiteLabel: branding.isWhiteLabel ?? false,
      }
    : defaultDraft
  );

  const { customDomain, companyName, brandColor, brandLogo, isWhiteLabel } = current;

  const updateField = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft({ ...current, [key]: value });
  };

  // ---- Save mutation ----
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      stationId: string;
      customDomain?: string | null;
      brandColor?: string;
      brandLogo?: string | null;
      companyName?: string;
      isWhiteLabel?: boolean;
    }) => {
      const res = await fetch('/api/stations/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['station-branding'] });
      setDraft(null);
      toast.success('Marque blanche enregistree avec succes');
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      stationId,
      customDomain: customDomain.trim() || null,
      brandColor,
      brandLogo: brandLogo.trim() || null,
      companyName: companyName.trim() || 'SmartTicketQR',
      isWhiteLabel,
    });
  };

  // ---- Helpers ----
  const savedValues: DraftState = branding
    ? {
        customDomain: branding.customDomain ?? '',
        companyName: branding.companyName ?? 'SmartTicketQR',
        brandColor: branding.brandColor ?? '#10b981',
        brandLogo: branding.brandLogo ?? '',
        isWhiteLabel: branding.isWhiteLabel ?? false,
      }
    : defaultDraft;

  const hasChanges =
    savedValues.customDomain !== (customDomain.trim() || '') ||
    savedValues.companyName !== (companyName.trim() || 'SmartTicketQR') ||
    savedValues.brandColor !== brandColor ||
    savedValues.brandLogo !== (brandLogo.trim() || '') ||
    savedValues.isWhiteLabel !== isWhiteLabel;

  // ---- Render ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <Palette className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Marque Blanche & Domaines
            </h3>
            <p className="text-xs text-slate-400">
              Personnalisez l&apos;apparence et le domaine de votre gare
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? (
              <Eye className="w-4 h-4 mr-1.5" />
            ) : (
              <Eye className="w-4 h-4 mr-1.5" />
            )}
            {showPreview ? 'Masquer apercu' : 'Apercu'}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!hasChanges || saveMutation.isPending}
            onClick={handleSave}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Left column: Form ---- */}
        <div className="space-y-5">
          {/* Custom Domain */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <CardTitle className="text-sm text-white">
                    Domaine personnalise
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Liez votre propre nom de domaine a la gare
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="relative">
                    <Label htmlFor="customDomain" className="sr-only">
                      Domaine personnalise
                    </Label>
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="customDomain"
                      type="text"
                      placeholder="gare.mondomaine.com"
                      value={customDomain}
                      onChange={(e) => updateField('customDomain', e.target.value)}
                      className="pl-10 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/40"
                    />
                  </div>
                  {customDomain && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <ExternalLink className="w-3 h-3" />
                      <span>https://{customDomain}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Brand Name */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-violet-400" />
                  <CardTitle className="text-sm text-white">
                    Nom de la marque
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Nom affiche en haut de l&apos;ecran d&apos;affichage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="companyName" className="sr-only">
                  Nom de la marque
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="SmartTicketQR"
                  value={companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/40"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Brand Color */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <CardTitle className="text-sm text-white">
                    Couleur principale
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Couleur utilisee pour les accents et le branding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {/* Native color picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => updateField('brandColor', e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-slate-700 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
                      aria-label="Selecteur de couleur"
                    />
                  </div>
                  {/* Hex input */}
                  <div className="flex-1">
                    <Label htmlFor="brandColorHex" className="sr-only">
                      Couleur hex
                    </Label>
                    <Input
                      id="brandColorHex"
                      type="text"
                      value={brandColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          updateField('brandColor', val);
                        }
                      }}
                      maxLength={7}
                      placeholder="#10b981"
                      className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 font-mono text-sm focus-visible:ring-emerald-500/40"
                    />
                  </div>
                  {/* Color swatch preview */}
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 border border-slate-700"
                    style={{ backgroundColor: brandColor }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Logo URL */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <Card className="border-slate-800 bg-slate-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">URL du logo</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Image SVG ou PNG pour le logo personnalise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="brandLogo" className="sr-only">
                    URL du logo
                  </Label>
                  <Input
                    id="brandLogo"
                    type="text"
                    placeholder="https://..."
                    value={brandLogo}
                    onChange={(e) => updateField('brandLogo', e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500/40"
                  />
                  {brandLogo && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950">
                      <img
                        src={brandLogo}
                        alt="Apercu logo"
                        className="w-8 h-8 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-slate-400 truncate">
                        {brandLogo}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* White Label Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-slate-800 bg-slate-900">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label
                      htmlFor="whiteLabelSwitch"
                      className="text-sm font-medium text-white"
                    >
                      Mode Marque Blanche
                    </Label>
                    <p className="text-xs text-slate-400">
                      Masquez le branding SmartTicketQR et utilisez votre
                      identite visuelle
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded',
                        isWhiteLabel
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-500'
                      )}
                    >
                      {isWhiteLabel ? 'Active' : 'Desactive'}
                    </span>
                    <Switch
                      id="whiteLabelSwitch"
                      checked={isWhiteLabel}
                      onCheckedChange={(val) => updateField('isWhiteLabel', val)}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ---- Right column: DNS info + Preview ---- */}
        <div className="space-y-5">
          {/* DNS Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="border-blue-800/50 bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Info className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-blue-300">
                      Configuration DNS
                    </h4>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                      Configurez un enregistrement CNAME vers votre serveur.
                    </p>
                    <Separator className="bg-blue-800/30 my-3" />
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-blue-300 bg-blue-800/30 px-1.5 py-0.5 rounded shrink-0">
                          CNAME
                        </span>
                        <code className="text-xs text-blue-200/80 font-mono break-all">
                          {customDomain || 'gare.mondomaine.com'}
                        </code>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-blue-300 bg-blue-800/30 px-1.5 py-0.5 rounded shrink-0">
                          cible
                        </span>
                        <code className="text-xs text-blue-200/80 font-mono">
                          smartticketqr.com
                        </code>
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-300/50 mt-3">
                      La propagation DNS peut prendre jusqu&apos;a 24 heures.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Live Preview */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, y: 12, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 12, height: 0 }}
                transition={{ duration: 0.35 }}
              >
                <Card className="border-slate-800 bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <CardTitle className="text-sm text-white">
                        Apercu en direct
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Simulated departure board header */}
                    <div
                      className="rounded-xl overflow-hidden border border-slate-700/50"
                    >
                      {/* Header bar with brand color */}
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ backgroundColor: brandColor }}
                      >
                        <div className="flex items-center gap-3">
                          {brandLogo ? (
                            <img
                              src={brandLogo}
                              alt="Logo"
                              className="w-8 h-8 object-contain rounded bg-white/20 p-0.5"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                              {companyName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-white font-bold text-sm">
                            {companyName || 'SmartTicketQR'}
                          </span>
                        </div>
                        <div className="text-white/80 text-xs font-mono">
                          {new Date().toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Mini departure board content */}
                      <div className="bg-slate-950 px-3 py-2 space-y-1.5">
                        <div className="grid grid-cols-[1fr_60px_50px] gap-2 text-[10px] text-slate-500 font-medium px-2">
                          <span>DESTINATION</span>
                          <span className="text-center">QUAI</span>
                          <span className="text-right">HEURE</span>
                        </div>
                        {[
                          { dest: 'Saint-Louis', platform: '3', time: '08:30' },
                          { dest: 'Thies', platform: '1', time: '08:45' },
                          { dest: 'Kaolack', platform: '5', time: '09:00' },
                        ].map((row) => (
                          <div
                            key={row.dest}
                            className="grid grid-cols-[1fr_60px_50px] gap-2 text-xs text-white px-2 py-1 rounded bg-slate-900/80"
                          >
                            <span className="font-medium truncate">
                              {row.dest}
                            </span>
                            <span
                              className="text-center font-bold rounded px-2 py-0.5 text-[10px]"
                              style={{
                                backgroundColor: `${brandColor}20`,
                                color: brandColor,
                              }}
                            >
                              {row.platform}
                            </span>
                            <span className="text-right font-mono">
                              {row.time}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div
                        className="px-4 py-2 flex items-center justify-between"
                        style={{
                          backgroundColor: `${brandColor}15`,
                          borderTop: `1px solid ${brandColor}30`,
                        }}
                      >
                        <span className="text-[10px] text-slate-400">
                          {branding?.name ?? 'Gare'} — {isWhiteLabel ? 'Marque blanche' : 'SmartTicketQR'}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: brandColor }}>
                          ● En ligne
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* When preview is not shown, show placeholder */}
          {!showPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-slate-800 bg-slate-900/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                    <Eye className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">
                    Apercu en direct
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cliquez sur &quot;Apercu&quot; pour voir le rendu avec votre
                    branding
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
