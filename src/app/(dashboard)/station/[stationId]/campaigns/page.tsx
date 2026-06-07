"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  BarChart3,
  ExternalLink,
  ImageIcon,
  MousePointerClick,
  DollarSign,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  X,
  LayoutGrid,
  LayoutList,
  Gauge,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Creative {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaText: string;
  displayOrder: number;
  isActive: boolean;
}

interface Campaign {
  id: string;
  name: string;
  advertiserName: string;
  targetingSlot: string;
  priority: number;
  budgetTotal: number;
  budgetSpent: number;
  cpmCost: number;
  cpcCost: number;
  maxImpressions: number | null;
  status: string;
  startDate: string;
  endDate: string | null;
  creativeCount: number;
  impressionCount: number;
  createdAt: string;
}

interface CampaignDetail extends Campaign {
  creatives: Creative[];
  stats: {
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    budgetSpent: number;
    budgetTotal: number;
    budgetUtilization: number;
  } | null;
}

// ─── Slot type labels + colors ─────────────────────────────────────────────────

const SLOT_LABELS: Record<string, { label: string; color: string }> = {
  header: { label: "En-tête", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  insert: { label: "Insertion", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  sidebar: { label: "Barre latérale", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  interstitial: { label: "Interstitial", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  paused: { label: "Pause", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  completed: { label: "Terminée", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: CheckCircle2 },
  exhausted: { label: "Épuisée", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const params = useParams<{ stationId: string }>();
  const stationId = params.stationId;
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [showCreativeDialog, setShowCreativeDialog] = useState(false);
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);
  const [deleteCreativeTarget, setDeleteCreativeTarget] = useState<Creative | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // ─── Fetch campaigns ───────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`/api/station/${stationId}/campaigns`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      toast.error("Erreur lors du chargement des campagnes");
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ─── Fetch campaign detail ──────────────────────────────────────────────
  const fetchDetail = useCallback(async (campaignId: string) => {
    try {
      const res = await fetch(`/api/station/${stationId}/campaigns/${campaignId}`);
      if (!res.ok) throw new Error("Fetch detail failed");
      const data = await res.json();
      setSelectedCampaign(data.campaign);
      setExpandedId(campaignId);
    } catch {
      toast.error("Erreur lors du chargement des détails");
    }
  }, [stationId]);

  // ─── Toggle expand ──────────────────────────────────────────────────────
  const toggleExpand = useCallback(
    (campaignId: string) => {
      if (expandedId === campaignId) {
        setExpandedId(null);
        setSelectedCampaign(null);
      } else {
        fetchDetail(campaignId);
      }
    },
    [expandedId, fetchDetail]
  );

  // ─── Update campaign status (pause/resume) ───────────────────────────────
  const toggleStatus = useCallback(
    async (campaign: Campaign) => {
      const newStatus = campaign.status === "active" ? "paused" : "active";
      try {
        const res = await fetch(`/api/station/${stationId}/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast.success(
          newStatus === "active"
            ? `Campagne "${campaign.name}" activée`
            : `Campagne "${campaign.name}" mise en pause`
        );
        fetchCampaigns();
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    },
    [stationId, fetchCampaigns]
  );

  // ─── Delete campaign ────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/station/${stationId}/campaigns/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Campagne "${deleteTarget.name}" supprimée`);
      setDeleteTarget(null);
      fetchCampaigns();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }, [deleteTarget, stationId, fetchCampaigns]);

  // ─── Format helpers ────────────────────────────────────────────────────
  const formatBudget = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toFixed(0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        {[1, 2, 3].map((i) => (
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

  return (
    <div className="space-y-6">
      {/* ─── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-amber-500" />
            Campagnes publicitaires
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos campagnes pub et suivez les performances
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border bg-muted p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                viewMode === "table" ? "bg-background shadow-sm" : "hover:bg-background/50"
              )}
              aria-label="Vue tableau"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
                viewMode === "grid" ? "bg-background shadow-sm" : "hover:bg-background/50"
              )}
              aria-label="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <CreateCampaignDialog
            stationId={stationId}
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onCreated={fetchCampaigns}
          />
        </div>
      </div>

      {/* ─── Empty state ────────────────────────────────────────────────── */}
      {campaigns.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Megaphone className="h-8 w-8 text-amber-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Aucune campagne</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Créez votre première campagne publicitaire pour commencer à diffuser des annonces.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une campagne
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── Stats summary cards ────────────────────────────────────────── */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Campagnes actives"
            value={campaigns.filter((c) => c.status === "active").length}
            total={campaigns.length}
            icon={Megaphone}
          />
          <StatCard
            label="Impressions totales"
            value={campaigns.reduce((sum, c) => sum + c.impressionCount, 0)}
            icon={Eye}
          />
          <StatCard
            label="Budget dépensé"
            value={formatBudget(campaigns.reduce((sum, c) => sum + c.budgetSpent, 0))}
            suffix=" FCFA"
            icon={DollarSign}
          />
          <StatCard
            label="Créatifs"
            value={campaigns.reduce((sum, c) => sum + c.creativeCount, 0)}
            icon={ImageIcon}
          />
        </div>
      )}

      {/* ─── Campaigns list ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const slotInfo = SLOT_LABELS[campaign.targetingSlot] ?? SLOT_LABELS.insert;
          const statusInfo = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.active;
          const StatusIcon = statusInfo.icon;
          const isExpanded = expandedId === campaign.id;
          const budgetUtil =
            campaign.budgetTotal > 0
              ? Math.min(100, (campaign.budgetSpent / campaign.budgetTotal) * 100)
              : 0;

          return (
            <motion.div key={campaign.id} layout>
              <Card className="overflow-hidden">
                {/* ─── Campaign row ────────────────────────────────────── */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(campaign.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleExpand(campaign.id);
                  }}
                >
                  {/* Expand toggle */}
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">
                        {campaign.name}
                      </p>
                      <Badge variant="outline" className={slotInfo.color}>
                        {slotInfo.label}
                      </Badge>
                      <Badge variant="outline" className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {campaign.advertiserName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        Priorité {campaign.priority}
                      </span>
                      <span>{formatDate(campaign.startDate)}</span>
                      <span>
                        {campaign.impressionCount} imp.
                      </span>
                    </div>
                  </div>

                  {/* Budget bar */}
                  {campaign.budgetTotal > 0 && (
                    <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                      <span className="text-xs text-muted-foreground">
                        {formatBudget(campaign.budgetSpent)} / {formatBudget(campaign.budgetTotal)} FCFA
                      </span>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            budgetUtil > 90 ? "bg-red-500" : budgetUtil > 70 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${budgetUtil}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleStatus(campaign)}
                      aria-label={campaign.status === "active" ? "Mettre en pause" : "Activer"}
                    >
                      {campaign.status === "active" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteTarget(campaign)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* ─── Expanded detail ──────────────────────────────────── */}
                <AnimatePresence>
                  {isExpanded && selectedCampaign && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <Separator />

                      <div className="p-4 space-y-4">
                        {/* Stats grid */}
                        {selectedCampaign.stats && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <MiniStat
                              label="Impressions"
                              value={selectedCampaign.stats.totalImpressions.toLocaleString("fr-FR")}
                              icon={Eye}
                            />
                            <MiniStat
                              label="Clicks"
                              value={selectedCampaign.stats.totalClicks.toLocaleString("fr-FR")}
                              icon={MousePointerClick}
                            />
                            <MiniStat
                              label="CTR"
                              value={`${(selectedCampaign.stats.ctr * 100).toFixed(2)}%`}
                              icon={BarChart3}
                            />
                            <MiniStat
                              label="Budget utilisé"
                              value={`${selectedCampaign.stats.budgetUtilization.toFixed(0)}%`}
                              icon={DollarSign}
                            />
                          </div>
                        )}

                        {/* Creatives list */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Créatifs ({selectedCampaign.creatives.length})
                            </h4>
                            <Button
                              size="sm"
                              onClick={() => {
                                setEditingCreative(null);
                                setShowCreativeDialog(true);
                              }}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Ajouter
                            </Button>
                          </div>

                          {selectedCampaign.creatives.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center">
                              <p className="text-sm text-muted-foreground">
                                Aucun créatif. Ajoutez au moins un créatif pour diffuser cette campagne.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedCampaign.creatives.map((creative) => (
                                <Card key={creative.id} className="overflow-hidden">
                                  <div className="flex items-start gap-3 p-3">
                                    {/* Preview */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-semibold truncate">
                                          {creative.title}
                                        </p>
                                        {creative.isActive ? (
                                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                                            Actif
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[10px]">
                                            Inactif
                                          </Badge>
                                        )}
                                      </div>
                                      {creative.body && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                          {creative.body}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {creative.imageUrl && (
                                          <span className="flex items-center gap-0.5">
                                            <ImageIcon className="h-3 w-3" />
                                            Image
                                          </span>
                                        )}
                                        {creative.linkUrl && (
                                          <span className="flex items-center gap-0.5">
                                            <ExternalLink className="h-3 w-3" />
                                            CTA: {creative.ctaText}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Creative actions */}
                                    <div className="flex flex-col gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          setEditingCreative(creative);
                                          setShowCreativeDialog(true);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => setDeleteCreativeTarget(creative)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Create Campaign Dialog ──────────────────────────────────────── */}
      <CreateCampaignDialog
        stationId={stationId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchCampaigns}
      />

      {/* ─── Create/Edit Creative Dialog ─────────────────────────────────── */}
      <CreativeDialog
        stationId={stationId}
        campaignId={selectedCampaign?.id ?? ""}
        creative={editingCreative}
        open={showCreativeDialog}
        onOpenChange={(open) => {
          setShowCreativeDialog(open);
          if (!open) setEditingCreative(null);
        }}
        onSaved={() => {
          if (selectedCampaign) fetchDetail(selectedCampaign.id);
          fetchCampaigns();
        }}
      />

      {/* ─── Delete Campaign Alert ───────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la campagne</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la campagne{" "}
              <span className="font-semibold">{deleteTarget?.name}</span> ?
              Cette action supprimera tous les créatifs et les statistiques associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Creative Alert ───────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteCreativeTarget}
        onOpenChange={() => setDeleteCreativeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le créatif</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer le créatif <span className="font-semibold">{deleteCreativeTarget?.title}</span> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteCreativeTarget || !selectedCampaign) return;
                try {
                  await fetch(
                    `/api/station/${stationId}/campaigns/${selectedCampaign.id}/creatives/${deleteCreativeTarget.id}`,
                    { method: "DELETE" }
                  );
                  toast.success("Créatif supprimé");
                  setDeleteCreativeTarget(null);
                  fetchDetail(selectedCampaign.id);
                } catch {
                  toast.error("Erreur lors de la suppression");
                }
              }}
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

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  suffix,
  total,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  total?: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">
            {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
            {suffix && <span className="text-xs font-normal ml-1">{suffix}</span>}
            {total !== undefined && (
              <span className="text-xs text-muted-foreground ml-1">/ {total}</span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Create Campaign Dialog ─────────────────────────────────────────────────

function CreateCampaignDialog({
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
    advertiserName: "",
    targetingSlot: "insert",
    priority: 50,
    budgetTotal: 0,
    cpmCost: 0,
    cpcCost: 0,
    maxImpressions: "",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: "",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        stationId,
        budgetSpent: 0,
        maxImpressions: form.maxImpressions ? Number(form.maxImpressions) : null,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      };

      const res = await fetch(`/api/station/${stationId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }

      toast.success(`Campagne "${form.name}" créée`);
      onCreated();
      onOpenChange(false);
      setForm({
        name: "",
        advertiserName: "",
        targetingSlot: "insert",
        priority: 50,
        budgetTotal: 0,
        cpmCost: 0,
        cpcCost: 0,
        maxImpressions: "",
        startDate: new Date().toISOString().slice(0, 16),
        endDate: "",
        status: "active",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-500" />
            Nouvelle campagne
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="camp-name">Nom de la campagne *</Label>
              <Input
                id="camp-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Promo Ramadan 2025"
                required
                className="mt-1.5"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="camp-advertiser">Annonceur *</Label>
              <Input
                id="camp-advertiser"
                value={form.advertiserName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, advertiserName: e.target.value }))
                }
                placeholder="Ex: Orange Sénégal"
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Slot cible *</Label>
              <Select
                value={form.targetingSlot}
                onValueChange={(v) => setForm((f) => ({ ...f, targetingSlot: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">En-tête</SelectItem>
                  <SelectItem value="insert">Insertion</SelectItem>
                  <SelectItem value="sidebar">Barre latérale</SelectItem>
                  <SelectItem value="interstitial">Interstitial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="camp-priority">Priorité (0-100)</Label>
              <Input
                id="camp-priority"
                type="number"
                min={0}
                max={100}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: Number(e.target.value) }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="camp-maximp">Max impressions</Label>
              <Input
                id="camp-maximp"
                type="number"
                min={1}
                value={form.maxImpressions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxImpressions: e.target.value }))
                }
                placeholder="Illimité"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="camp-budget">Budget total (FCFA)</Label>
              <Input
                id="camp-budget"
                type="number"
                min={0}
                value={form.budgetTotal || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budgetTotal: Number(e.target.value) }))
                }
                placeholder="0 = illimité"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="camp-cpm">CPM (FCFA)</Label>
              <Input
                id="camp-cpm"
                type="number"
                min={0}
                step={0.01}
                value={form.cpmCost || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cpmCost: Number(e.target.value) }))
                }
                placeholder="Coût / 1000 imp."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="camp-cpc">CPC (FCFA)</Label>
              <Input
                id="camp-cpc"
                type="number"
                min={0}
                step={0.01}
                value={form.cpcCost || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cpcCost: Number(e.target.value) }))
                }
                placeholder="Coût / clic"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="camp-start">Date de début *</Label>
              <Input
                id="camp-start"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="camp-end">Date de fin</Label>
              <Input
                id="camp-end"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                placeholder="Laisser vide = pas de fin"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !form.name || !form.advertiserName}>
              {submitting ? "Création…" : "Créer la campagne"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Creative Dialog ──────────────────────────────────────────────────────────

function CreativeDialog({
  stationId,
  campaignId,
  creative,
  open,
  onOpenChange,
  onSaved,
}: {
  stationId: string;
  campaignId: string;
  creative: Creative | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEditing = !!creative;
  const [form, setForm] = useState({
    title: creative?.title ?? "",
    body: creative?.body ?? "",
    imageUrl: creative?.imageUrl ?? "",
    linkUrl: creative?.linkUrl ?? "",
    ctaText: creative?.ctaText ?? "En savoir plus",
    displayOrder: creative?.displayOrder ?? 0,
    isActive: creative?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Reset form when creative changes
  useEffect(() => {
    setForm({
      title: creative?.title ?? "",
      body: creative?.body ?? "",
      imageUrl: creative?.imageUrl ?? "",
      linkUrl: creative?.linkUrl ?? "",
      ctaText: creative?.ctaText ?? "En savoir plus",
      displayOrder: creative?.displayOrder ?? 0,
      isActive: creative?.isActive ?? true,
    });
  }, [creative]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        body: form.body || null,
        imageUrl: form.imageUrl || null,
        linkUrl: form.linkUrl || null,
      };

      const url = isEditing
        ? `/api/station/${stationId}/campaigns/${campaignId}/creatives/${creative.id}`
        : `/api/station/${stationId}/campaigns/${campaignId}/creatives`;

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? payload
            : { ...payload, campaignId }
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }

      toast.success(
        isEditing
          ? `Créatif "${form.title}" mis à jour`
          : `Créatif "${form.title}" ajouté`
      );
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le créatif" : "Nouveau créatif"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="creative-title">Titre *</Label>
            <Input
              id="creative-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Titre de l'annonce"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="creative-body">Description</Label>
            <Textarea
              id="creative-body"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Texte descriptif de l'annonce"
              rows={2}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="creative-image">URL de l&apos;image</Label>
              <Input
                id="creative-image"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                placeholder="https://example.com/banner.jpg"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="creative-link">URL de destination</Label>
              <Input
                id="creative-link"
                value={form.linkUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linkUrl: e.target.value }))
                }
                placeholder="https://example.com/promo"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="creative-cta">Texte du bouton</Label>
              <Input
                id="creative-cta"
                value={form.ctaText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ctaText: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="creative-order">Ordre</Label>
              <Input
                id="creative-order"
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    displayOrder: Number(e.target.value),
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isActive: v }))
                  }
                />
                <Label className="text-sm">Actif</Label>
              </div>
            </div>
          </div>

          {/* Live preview */}
          {(form.title || form.body || form.imageUrl) && (
            <div className="rounded-lg border p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Aperçu
              </p>
              <div className="rounded-md border bg-white dark:bg-gray-900 overflow-hidden">
                {form.imageUrl && (
                  <div className="aspect-[3/1] bg-muted">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold">{form.title || "Titre"}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      Sponsorisé
                    </span>
                  </div>
                  {form.body && (
                    <p className="text-xs text-muted-foreground">{form.body}</p>
                  )}
                  {form.linkUrl && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-black">
                        {form.ctaText || "En savoir plus"}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !form.title}>
              {submitting
                ? isEditing
                  ? "Mise à jour…"
                  : "Ajout…"
                : isEditing
                  ? "Mettre à jour"
                  : "Ajouter le créatif"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
