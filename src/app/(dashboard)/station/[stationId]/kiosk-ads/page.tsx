"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tv,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Image as ImageIcon,
  Video,
  Youtube,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface KioskAd {
  id: string;
  name: string;
  type: string;
  url: string;
  durationSeconds: number;
  intervalMinutes: number;
  isActive: boolean;
  lastPlayedAt: string | null;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  IMAGE: {
    label: "Image",
    icon: ImageIcon,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  VIDEO: {
    label: "Vidéo",
    icon: Video,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  YOUTUBE: {
    label: "YouTube",
    icon: Youtube,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const DURATION_LABELS: Record<number, string> = {
  10: "10 secondes",
  15: "15 secondes",
  30: "30 secondes",
  60: "1 minute",
};

const INTERVAL_LABELS: Record<number, string> = {
  15: "Toutes les 15 min",
  30: "Toutes les 30 min",
  60: "Toutes les heures",
  90: "Toutes les 1h30",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Jamais";
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function KioskAdsPage() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;

  const [ads, setAds] = useState<KioskAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KioskAd | null>(null);

  // ─── Fetch ads ───────────────────────────────────────────────────────────
  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch(`/api/kiosk-ads?stationId=${stationId}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setAds(data.ads ?? []);
    } catch {
      toast.error("Erreur lors du chargement des publicités");
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // ─── Toggle active ───────────────────────────────────────────────────────
  const toggleActive = useCallback(
    async (ad: KioskAd) => {
      try {
        const res = await fetch(`/api/kiosk-ads/${ad.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !ad.isActive }),
        });
        if (!res.ok) throw new Error("Toggle failed");
        toast.success(
          ad.isActive
            ? `Publicité "${ad.name}" désactivée`
            : `Publicité "${ad.name}" activée`
        );
        fetchAds();
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    },
    [fetchAds]
  );

  // ─── Delete ad ──────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/kiosk-ads/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Publicité "${deleteTarget.name}" supprimée`);
      setDeleteTarget(null);
      fetchAds();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }, [deleteTarget, fetchAds]);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 w-3/4 rounded bg-muted mb-3" />
              <div className="h-4 w-1/2 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeCount = ads.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      {/* ─── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tv className="h-6 w-6 text-cyan-500" />
            Publicités Kiosk
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les publicités plein écran diffusées sur vos écrans de gare
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une pub
        </Button>
      </div>

      {/* ─── Stats ──────────────────────────────────────────────────────── */}
      {ads.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <Tv className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold tabular-nums">{ads.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Power className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Actives</p>
                <p className="text-lg font-bold tabular-nums">{activeCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Types</p>
                <p className="text-lg font-bold tabular-nums">
                  {new Set(ads.map((a) => a.type)).size}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Empty state ───────────────────────────────────────────────── */}
      {ads.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/30">
              <Tv className="h-8 w-8 text-cyan-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Aucune publicité</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des publicités qui seront diffusées en plein écran sur vos
                écrans kiosk.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une publicité
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Ads list ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <AnimatePresence>
          {ads.map((ad, index) => {
            const typeInfo = TYPE_CONFIG[ad.type] ?? {
              label: ad.type,
              icon: ImageIcon,
              color: "",
            };
            const TypeIcon = typeInfo.icon;

            return (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "overflow-hidden transition-all",
                    !ad.isActive && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Type icon */}
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                        typeInfo.color
                      )}
                    >
                      <TypeIcon className="h-6 w-6" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">
                          {ad.name}
                        </p>
                        <Badge variant="outline" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                        {ad.isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {ad.url}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {DURATION_LABELS[ad.durationSeconds] ?? `${ad.durationSeconds}s`}
                        </span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          {INTERVAL_LABELS[ad.intervalMinutes] ?? `${ad.intervalMinutes}min`}
                        </span>
                        <span>Dernière : {formatDate(ad.lastPlayedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={ad.isActive}
                        onCheckedChange={() => toggleActive(ad)}
                        aria-label={ad.isActive ? "Désactiver" : "Activer"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteTarget(ad)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ─── Create Dialog ──────────────────────────────────────────────── */}
      <CreateAdDialog
        stationId={stationId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchAds}
      />

      {/* ─── Delete Alert ───────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la publicité</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la publicité{" "}
              <span className="font-semibold">{deleteTarget?.name}</span> ? Elle ne
              sera plus diffusée sur les écrans kiosk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CREATE AD DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

function CreateAdDialog({
  stationId,
  open,
  onOpenChange,
  onCreated,
}: {
  stationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    type: "IMAGE",
    url: "",
    durationSeconds: 15,
    intervalMinutes: 30,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/kiosk-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, ...form }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }

      toast.success(`Publicité "${form.name}" ajoutée`);
      onCreated();
      onOpenChange(false);
      setForm({
        name: "",
        type: "IMAGE",
        url: "",
        durationSeconds: 15,
        intervalMinutes: 30,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-cyan-500" />
            Nouvelle publicité kiosk
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom */}
          <div>
            <Label htmlFor="ad-name">Nom de la campagne *</Label>
            <Input
              id="ad-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Pub Orange Money"
              required
              className="mt-1.5"
            />
          </div>

          {/* Type + URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Type de média *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> Image (JPG/PNG)
                    </span>
                  </SelectItem>
                  <SelectItem value="VIDEO">
                    <span className="flex items-center gap-2">
                      <Video className="h-4 w-4" /> Vidéo (.MP4)
                    </span>
                  </SelectItem>
                  <SelectItem value="YOUTUBE">
                    <span className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" /> Lien YouTube
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ad-url">URL du média *</Label>
              <Input
                id="ad-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                required
                className="mt-1.5"
              />
            </div>
          </div>

          {/* URL hint */}
          {form.type === "YOUTUBE" && (
            <p className="text-xs text-muted-foreground">
              💡 Collez un lien YouTube complet (ex: https://youtube.com/watch?v=...)
            </p>
          )}
          {form.type === "VIDEO" && (
            <p className="text-xs text-muted-foreground">
              💡 Utilisez un lien direct vers un fichier .mp4 hébergé
            </p>
          )}
          {form.type === "IMAGE" && (
            <p className="text-xs text-muted-foreground">
              💡 Utilisez un lien direct vers une image JPG/PNG hébergée
            </p>
          )}

          {/* Duration + Interval */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Durée d&apos;affichage</Label>
              <Select
                value={String(form.durationSeconds)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, durationSeconds: Number(v) }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 secondes</SelectItem>
                  <SelectItem value="15">15 secondes</SelectItem>
                  <SelectItem value="30">30 secondes</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fréquence de diffusion</Label>
              <Select
                value={String(form.intervalMinutes)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, intervalMinutes: Number(v) }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Toutes les 15 min</SelectItem>
                  <SelectItem value="30">Toutes les 30 min</SelectItem>
                  <SelectItem value="60">Toutes les heures</SelectItem>
                  <SelectItem value="90">Toutes les 1h30</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.name || !form.url}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              {submitting ? "Ajout..." : "Ajouter la publicité"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
