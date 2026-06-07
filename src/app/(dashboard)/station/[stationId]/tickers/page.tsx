"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  GripVertical,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TickerItem {
  id: string;
  text: string;
  type: string;
  isActive: boolean;
  displayOrder: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TICKER_TYPES = [
  { value: "info", label: "Information", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "ad", label: "Publicité", color: "bg-amber-100 text-amber-700 border-amber-200" },
] as const;

function typeBadge(type: string) {
  const t = TICKER_TYPES.find((t) => t.value === type);
  if (!t) return <Badge variant="secondary">{type}</Badge>;
  return (
    <Badge className={cn(t.color)}>
      {t.label}
    </Badge>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function TickersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-9 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Ticker Form ───────────────────────────────────────────────────────────────

interface TickerFormData {
  text: string;
  type: string;
  displayOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: TickerFormData = {
  text: "",
  type: "info",
  displayOrder: 0,
  isActive: true,
};

function TickerForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial: TickerFormData;
  onSubmit: (data: TickerFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<TickerFormData>(initial);

  function update(partial: Partial<TickerFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="ticker-text">Message</Label>
        <Textarea
          id="ticker-text"
          placeholder="Entrez le texte du message…"
          value={form.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticker-type">Type</Label>
        <Select
          value={form.type}
          onValueChange={(v) => update({ type: v })}
        >
          <SelectTrigger id="ticker-type" className="w-full">
            <SelectValue placeholder="Choisir un type" />
          </SelectTrigger>
          <SelectContent>
            {TICKER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ticker-order">Ordre d&apos;affichage</Label>
          <Input
            id="ticker-order"
            type="number"
            min={0}
            value={form.displayOrder}
            onChange={(e) => update({ displayOrder: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch
            id="ticker-active"
            checked={form.isActive}
            onCheckedChange={(checked) => update({ isActive: checked })}
          />
          <Label htmlFor="ticker-active" className="text-sm">
            Actif
          </Label>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={loading || !form.text.trim()}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          Enregistrer
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StationTickersPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  const [tickers, setTickers] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState<TickerItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTickers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/station/${stationId}/tickers`);
      if (!res.ok) throw new Error("Erreur lors du chargement des messages");
      const data = await res.json();
      setTickers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchTickers();
  }, [fetchTickers]);

  // ─── Submit (create / edit) ─────────────────────────────────────────────────

  async function handleSubmit(form: TickerFormData) {
    try {
      setFormLoading(true);

      const isEditing = editingTicker !== null;
      const url = isEditing
        ? `/api/station/${stationId}/tickers/${editingTicker.id}`
        : `/api/station/${stationId}/tickers`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erreur lors de l&apos;enregistrement");

      toast.success(
        isEditing ? "Message modifié avec succès" : "Message créé avec succès"
      );
      setDialogOpen(false);
      setEditingTicker(null);
      fetchTickers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setFormLoading(false);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/station/${stationId}/tickers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      toast.success("Message supprimé avec succès");
      fetchTickers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  // ─── Toggle active ──────────────────────────────────────────────────────────

  async function handleToggle(ticker: TickerItem) {
    try {
      const res = await fetch(`/api/station/${stationId}/tickers/${ticker.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ticker.isActive }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      toast.success(
        ticker.isActive ? "Message désactivé" : "Message activé"
      );
      fetchTickers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  // ─── Dialog handlers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditingTicker(null);
    setDialogOpen(true);
  }

  function openEdit(ticker: TickerItem) {
    setEditingTicker(ticker);
    setDialogOpen(true);
  }

  function getInitialForm(): TickerFormData {
    if (editingTicker) {
      return {
        text: editingTicker.text,
        type: editingTicker.type,
        displayOrder: editingTicker.displayOrder,
        isActive: editingTicker.isActive,
      };
    }
    return { ...EMPTY_FORM };
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages d&apos;affichage</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les messages diffusés sur les écrans de la gare
          </p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="size-4" />
          Nouveau message
        </Button>
      </div>

      <Separator />

      {/* Content */}
      {loading ? (
        <TickersSkeleton />
      ) : tickers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Megaphone className="size-6 text-amber-500" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">
            Aucun message
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Créez votre premier message d&apos;affichage pour la gare.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-4 border-amber-300 text-amber-600 hover:bg-amber-50"
          >
            <Plus className="size-4" />
            Créer un message
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {tickers.map((ticker) => (
              <motion.div
                key={ticker.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                layout
              >
                <Card className={cn(!ticker.isActive && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Drag handle (visual only) */}
                      <div className="mt-0.5 hidden sm:flex">
                        <GripVertical className="size-4 text-muted-foreground/40" />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {typeBadge(ticker.type)}
                          <span className="text-xs text-muted-foreground">
                            Ordre {ticker.displayOrder}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed break-words">
                          {ticker.text}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={ticker.isActive}
                          onCheckedChange={() => handleToggle(ticker)}
                          aria-label="Activer/désactiver"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(ticker)}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Modifier</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Supprimer</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Ce message ne sera plus diffusé sur les écrans de la gare.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(ticker.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
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
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTicker ? "Modifier le message" : "Nouveau message"}
            </DialogTitle>
            <DialogDescription>
              {editingTicker
                ? "Modifiez le message d'affichage."
                : "Créez un nouveau message pour les écrans de la gare."}
            </DialogDescription>
          </DialogHeader>
          <TickerForm
            key={editingTicker?.id ?? "new"}
            initial={getInitialForm()}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditingTicker(null);
            }}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
