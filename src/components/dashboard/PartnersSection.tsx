'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import {
  Plus, Trash2, Store, Utensils, Bed, Car, ShoppingBag, QrCode,
  Eye, EyeOff, Loader2,
} from 'lucide-react';
import { MerchantForm } from '@/components/dashboard/MerchantForm';
import { QrCodeDisplay } from '@/components/dashboard/QrCodeDisplay';

// ============================================================
// Types
// ============================================================

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
  _count: { qrScans: number; offers: number };
}

interface PartnersSectionProps {
  stationId: string;
}

// ============================================================
// Category Config
// ============================================================

const categoryConfig: Record<string, { label: string; icon: React.ElementType; colorClass: string; bgClass: string }> = {
  RESTAURANT: { label: 'Restaurant', icon: Utensils, colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20' },
  TAXI: { label: 'Taxi', icon: Car, colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20' },
  HOTEL: { label: 'Hotel', icon: Bed, colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20' },
  SHOP: { label: 'Boutique', icon: ShoppingBag, colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20' },
  SERVICE: { label: 'Service', icon: Store, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20' },
  TRANSPORT: { label: 'Transport', icon: Car, colorClass: 'text-sky-400', bgClass: 'bg-sky-500/20' },
  GENERAL: { label: 'General', icon: Store, colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20' },
};

// ============================================================
// Component
// ============================================================

export function PartnersSection({ stationId }: PartnersSectionProps) {
  const queryClient = useQueryClient();

  // Fetch merchants
  const { data: merchants, isLoading } = useQuery<Merchant[]>({
    queryKey: ['merchants', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants?stationId=${stationId}`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 15000,
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch('/api/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast.success('Statut mis a jour');
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/merchants?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast.success('Partenaire supprime');
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const merchantCount = merchants?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <Store className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Marketplace Partenaires</h3>
            <p className="text-xs text-slate-400">
              {merchantCount} partenaire{merchantCount !== 1 ? 's' : ''} configure{merchantCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <MerchantForm stationId={stationId} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : !merchants?.length ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Aucun partenaire configure</p>
            <p className="text-xs text-slate-500 mt-1">
              Ajoutez votre premier partenaire commercial
            </p>
            <MerchantForm stationId={stationId} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {merchants.map((m) => {
              const config = categoryConfig[m.category] || categoryConfig.GENERAL;
              const CatIcon = config.icon;

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  layout
                >
                  <Card
                    className={cn(
                      'border-slate-800 bg-slate-900 relative overflow-hidden transition-colors',
                      !m.isActive && 'opacity-60',
                    )}
                  >
                    <CardContent className="p-5 space-y-3">
                      {/* Top: category badge + toggle */}
                      <div className="flex justify-between items-start">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-bold uppercase',
                            config.bgClass,
                            config.colorClass,
                          )}
                        >
                          {config.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`m-toggle-${m.id}`} className="sr-only">
                            Actif
                          </Label>
                          <Switch
                            id={`m-toggle-${m.id}`}
                            checked={m.isActive}
                            onCheckedChange={() =>
                              toggleMutation.mutate({ id: m.id, isActive: !m.isActive })
                            }
                            disabled={toggleMutation.isPending}
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              m.isActive ? 'text-emerald-400' : 'text-slate-500',
                            )}
                          >
                            {m.isActive ? 'En ligne' : 'Masque'}
                          </span>
                        </div>
                      </div>

                      {/* Name + Offer */}
                      <div>
                        <h3 className="text-lg font-bold text-white">{m.name}</h3>
                        {m.offerText && (
                          <p className="text-amber-400 text-sm font-medium mt-1">
                            {m.offerText}
                          </p>
                        )}
                        {m.offerCode && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs font-mono rounded">
                            {m.offerCode}
                          </span>
                        )}
                      </div>

                      {/* Footer: ID + QR + Delete */}
                      <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                        <span className="text-xs text-slate-600 font-mono">
                          {m.id.slice(0, 8)}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* QR Code toggle */}
                          <details className="relative group">
                            <summary className="cursor-pointer text-emerald-400 text-sm font-medium hover:text-emerald-300 list-none flex items-center gap-1">
                              <QrCode className="w-4 h-4" />
                              QR
                            </summary>
                            <div className="absolute right-0 bottom-full mb-2 z-20 shadow-2xl rounded-xl overflow-hidden border border-slate-700">
                              <QrCodeDisplay
                                stationId={stationId}
                                merchantId={m.id}
                                merchantName={m.name}
                              />
                            </div>
                          </details>

                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-slate-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">
                                  Supprimer {m.name} ?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Cette action est irreversible. Le QR code ne sera plus valide.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                  Annuler
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => deleteMutation.mutate(m.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : null}
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
