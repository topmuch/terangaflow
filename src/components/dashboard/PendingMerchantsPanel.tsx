'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Store, Clock, CheckCircle2, XCircle, Mail, Phone,
  Utensils, Bed, Car, ShoppingBag, Loader2, Hourglass,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface PendingMerchant {
  id: string;
  stationId: string;
  name: string;
  description: string | null;
  category: string;
  email: string | null;
  phone: string | null;
  status: string;
  planType: string;
  createdAt: string;
  station: { id: string; name: string; city: string | null };
}

interface PendingMerchantsPanelProps {
  stationId: string;
}

// ============================================================
// Category Config (emoji + styling)
// ============================================================

const categoryConfig: Record<string, { label: string; emoji: string; colorClass: string; bgClass: string }> = {
  RESTAURANT: { label: 'Restaurant', emoji: '🍽️', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20' },
  TAXI: { label: 'Taxi', emoji: '🚕', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20' },
  HOTEL: { label: 'Hotel', emoji: '🏨', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20' },
  SHOP: { label: 'Boutique', emoji: '🛍️', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20' },
  SERVICE: { label: 'Service', emoji: '🔧', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20' },
  TRANSPORT: { label: 'Transport', emoji: '🚌', colorClass: 'text-sky-400', bgClass: 'bg-sky-500/20' },
  GENERAL: { label: 'General', emoji: '🏪', colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20' },
};

const planLabels: Record<string, string> = {
  FREE: 'Gratuit',
  WELCOME_PACK: 'Welcome Pack',
  PREMIUM: 'Premium',
};

// ============================================================
// Component
// ============================================================

export function PendingMerchantsPanel({ stationId }: PendingMerchantsPanelProps) {
  const queryClient = useQueryClient();

  // Fetch pending merchants
  const { data: merchants, isLoading } = useQuery<PendingMerchant[]>({
    queryKey: ['pending-merchants', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/pending?stationId=${stationId}`);
      if (!res.ok) throw new Error('Failed to fetch pending merchants');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 30000,
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      const res = await fetch('/api/merchants/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (_data, merchantId) => {
      queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast.success('Marchand valide avec succes');
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      const res = await fetch('/api/merchants/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId, reason: 'rejected' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-merchants'] });
      toast.success('Marchand refuse');
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const pendingCount = merchants?.length ?? 0;
  const isActioning = validateMutation.isPending || rejectMutation.isPending;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Hourglass className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Marchands en attente
              {pendingCount > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30 text-xs font-bold">
                  {pendingCount}
                </Badge>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {pendingCount === 0
                ? 'Aucun marchand en attente'
                : `${pendingCount} demande${pendingCount > 1 ? 's' : ''} a traiter`}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : !merchants?.length ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Aucun marchand en attente</p>
            <p className="text-xs text-slate-500 mt-1">
              Les nouvelles demandes apparaitront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {merchants.map((m) => {
              const config = categoryConfig[m.category] || categoryConfig.GENERAL;

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  layout
                >
                  <Card className="border-slate-800 bg-slate-900 overflow-hidden transition-all hover:border-slate-700">
                    <CardContent className="p-5 space-y-4">
                      {/* Top: Category badge + Plan */}
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase',
                            config.bgClass,
                            config.colorClass,
                          )}
                        >
                          <span>{config.emoji}</span>
                          {config.label}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-medium border-slate-700',
                            m.planType === 'PREMIUM'
                              ? 'text-amber-400 border-amber-500/30'
                              : m.planType === 'WELCOME_PACK'
                                ? 'text-sky-400 border-sky-500/30'
                                : 'text-slate-400',
                          )}
                        >
                          {planLabels[m.planType] || m.planType}
                        </Badge>
                      </div>

                      {/* Name */}
                      <div>
                        <h4 className="text-lg font-bold text-white leading-tight">{m.name}</h4>
                        {m.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1.5">
                        {m.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{m.email}</span>
                          </div>
                        )}
                        {m.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{m.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span>Inscrit le {formatDate(m.createdAt)}</span>
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="border-t border-slate-800" />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9"
                          onClick={() => validateMutation.mutate(m.id)}
                          disabled={isActioning}
                        >
                          {validateMutation.isPending && validateMutation.variables === m.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Valider
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs font-semibold h-9"
                              disabled={isActioning}
                            >
                              {rejectMutation.isPending && rejectMutation.variables === m.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              Refuser
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-900 border-slate-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">
                                Refuser {m.name} ?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Cette action suspendra la demande de {m.name}. Le marchand sera informe que sa demande a ete refusee.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                Annuler
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => rejectMutation.mutate(m.id)}
                              >
                                Confirmer le refus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
