"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Store,
  MoreHorizontal,
  QrCode,
  Phone,
  Eye,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import MerchantForm from "@/components/dashboard/MerchantForm";
import { QrCodeDisplay } from "@/components/dashboard/QrCodeDisplay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MerchantItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  whatsapp: string | null;
  mapsUrl: string | null;
  promoText: string | null;
  promoExpiry: string | null;
  logo: string | null;
  isActive: boolean;
  displayOrder: number;
  stationId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  restaurant: { icon: "🍽️", color: "bg-orange-100 text-orange-700" },
  boutique: { icon: "🛍️", color: "bg-purple-100 text-purple-700" },
  transport: { icon: "🚌", color: "bg-blue-100 text-blue-700" },
  service: { icon: "🔧", color: "bg-gray-100 text-gray-700" },
  banque: { icon: "🏦", color: "bg-green-100 text-green-700" },
  telecom: { icon: "📱", color: "bg-cyan-100 text-cyan-700" },
  autre: { icon: "📦", color: "bg-gray-100 text-gray-600" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryBadge(category: string) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.autre;
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 border-0 font-medium", config.color)}
    >
      <span className="text-sm">{config.icon}</span>
      <span className="capitalize">{category}</span>
    </Badge>
  );
}

function statusBadge(isActive: boolean) {
  return isActive ? (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
      Actif
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200"
    >
      Inactif
    </Badge>
  );
}

function promoBadge(merchant: MerchantItem) {
  if (!merchant.promoText) return null;

  const hasExpired =
    merchant.promoExpiry && new Date(merchant.promoExpiry) < new Date();

  if (hasExpired) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200">
        Promo expirée
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
      🔥 Promo
    </Badge>
  );
}

function maskWhatsapp(phone: string | null): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return phone;
  const visible = cleaned.slice(-2);
  return `••••${visible}`;
}

function getPublicUrl(stationId: string, merchantId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/p/${stationId}/${merchantId}`;
  }
  return `/p/${stationId}/${merchantId}`;
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-36" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PartnersPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<MerchantItem | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrPreviewMerchant, setQrPreviewMerchant] =
    useState<MerchantItem | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/station/${stationId}/merchants`);
      if (!res.ok)
        throw new Error("Erreur lors du chargement des partenaires");
      const data = await res.json();
      setMerchants(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/station/${stationId}/merchants/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      toast.success("Partenaire supprimé avec succès");
      setDeletingId(null);
      if (qrPreviewMerchant?.id === id) {
        setQrPreviewMerchant(null);
      }
      fetchMerchants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  // ─── Toggle Active ──────────────────────────────────────────────────────────

  async function handleToggleActive(merchant: MerchantItem) {
    try {
      const res = await fetch(
        `/api/station/${stationId}/merchants/${merchant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !merchant.isActive }),
        }
      );
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      toast.success(
        merchant.isActive
          ? `Partenaire "${merchant.name}" désactivé`
          : `Partenaire "${merchant.name}" activé`
      );
      fetchMerchants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  // ─── Dialog Handlers ───────────────────────────────────────────────────────

  function openCreate() {
    setEditingMerchant(null);
    setDialogOpen(true);
  }

  function openEdit(merchant: MerchantItem) {
    setEditingMerchant(merchant);
    setDialogOpen(true);
  }

  function handleFormSuccess() {
    setDialogOpen(false);
    setEditingMerchant(null);
    fetchMerchants();
    toast.success(
      editingMerchant
        ? "Partenaire modifié avec succès"
        : "Partenaire créé avec succès"
    );
  }

  // ─── QR Preview ────────────────────────────────────────────────────────────

  function openQrPreview(merchant: MerchantItem) {
    setQrPreviewMerchant(merchant);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partenaires</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les commerçants et services de votre gare
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="size-4" />
          Nouveau partenaire
        </Button>
      </div>

      <Separator />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Loading skeleton - left column */}
          <div className="lg:col-span-2 hidden md:block">
            <TableSkeleton />
          </div>
          <div className="lg:col-span-2 md:hidden">
            <CardsSkeleton />
          </div>
          {/* Loading skeleton - right column */}
          <div className="hidden lg:block">
            <Card className="p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-[200px] w-[200px] rounded-xl mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto mt-4" />
              <div className="flex gap-2 justify-center mt-3">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </Card>
          </div>
        </div>
      ) : merchants.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Store className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            Aucun partenaire
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Commencez par ajouter votre premier partenaire commercial.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-4 border-amber-300 text-amber-600 hover:bg-amber-50"
          >
            <Plus className="size-4" />
            Créer un partenaire
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left Column: Merchant List ────────────────────────────── */}
          <div className="lg:col-span-2">
            {/* Desktop: Table View */}
            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Promo</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {merchants.map((merchant) => (
                      <motion.tr
                        key={merchant.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="hover:bg-muted/50 border-b transition-colors"
                      >
                        <TableCell>
                          {getCategoryBadge(merchant.category)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {merchant.logo ? (
                              <img
                                src={merchant.logo}
                                alt={merchant.name}
                                className="size-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-semibold text-amber-700">
                                {merchant.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {merchant.name}
                              </p>
                              {merchant.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {merchant.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {merchant.whatsapp ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="size-3.5" />
                              {maskWhatsapp(merchant.whatsapp)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell>{promoBadge(merchant)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusBadge(merchant.isActive)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEdit(merchant)}
                              >
                                <Pencil className="size-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openQrPreview(merchant)}
                              >
                                <QrCode className="size-4 mr-2" />
                                QR Code
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleActive(merchant)
                                }
                              >
                                {merchant.isActive ? (
                                  <Eye className="size-4 mr-2" />
                                ) : (
                                  <Eye className="size-4 mr-2" />
                                )}
                                {merchant.isActive ? "Désactiver" : "Activer"}
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeletingId(merchant.id);
                                    }}
                                  >
                                    <Trash2 className="size-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Supprimer{" "}
                                      {merchant.name} ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action désactivera le partenaire et
                                      sa page publique ne sera plus accessible.
                                      Les visiteurs verront une page 404.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel
                                      onClick={() => setDeletingId(null)}
                                    >
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDelete(merchant.id)
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Card View */}
            <div className="md:hidden grid gap-3">
              <AnimatePresence>
                {merchants.map((merchant) => (
                  <motion.div
                    key={merchant.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              {getCategoryBadge(merchant.category)}
                              {statusBadge(merchant.isActive)}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              {merchant.logo ? (
                                <img
                                  src={merchant.logo}
                                  alt={merchant.name}
                                  className="size-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="size-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700 shrink-0">
                                  {merchant.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <p className="font-medium truncate">
                                {merchant.name}
                              </p>
                            </div>
                            {merchant.whatsapp && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="size-3" />
                                {maskWhatsapp(merchant.whatsapp)}
                              </p>
                            )}
                            {merchant.promoText && (
                              <div className="mt-1.5">
                                {promoBadge(merchant)}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => openEdit(merchant)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => openQrPreview(merchant)}
                              >
                                <QrCode className="size-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={merchant.isActive}
                                onCheckedChange={() =>
                                  handleToggleActive(merchant)
                                }
                                className="data-[state=checked]:bg-emerald-500"
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Supprimer {merchant.name} ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action désactivera le partenaire et
                                      sa page publique ne sera plus accessible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDelete(merchant.id)
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ─── Right Column: QR Code Preview Panel ────────────────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-0">
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Aperçu QR Code
                </h3>
                {qrPreviewMerchant ? (
                  <motion.div
                    key={qrPreviewMerchant.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {qrPreviewMerchant.logo ? (
                          <img
                            src={qrPreviewMerchant.logo}
                            alt={qrPreviewMerchant.name}
                            className="size-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-semibold text-amber-700">
                            {qrPreviewMerchant.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="font-medium text-sm">
                          {qrPreviewMerchant.name}
                        </p>
                      </div>
                      {getCategoryBadge(qrPreviewMerchant.category)}
                    </div>

                    <Separator />

                    <QrCodeDisplay
                      url={`/p/${stationId}/${qrPreviewMerchant.id}`}
                      size={200}
                      label="QR Code"
                      showActions={true}
                    />

                    <div className="w-full rounded-lg bg-muted/50 p-3">
                      <p className="text-[11px] text-muted-foreground mb-1 font-medium">
                        URL publique
                      </p>
                      <p className="text-xs font-mono text-foreground break-all">
                        {getPublicUrl(stationId, qrPreviewMerchant.id)}
                      </p>
                    </div>

                    {qrPreviewMerchant.promoText && (
                      <div className="w-full rounded-lg bg-amber-50 border border-amber-200 p-3">
                        <p className="text-xs font-medium text-amber-700 mb-0.5">
                          🔥 Offre promo
                        </p>
                        <p className="text-xs text-amber-600">
                          {qrPreviewMerchant.promoText}
                        </p>
                        {qrPreviewMerchant.promoExpiry && (
                          <p className="text-[10px] text-amber-500 mt-1">
                            Expire le{" "}
                            {new Date(
                              qrPreviewMerchant.promoExpiry
                            ).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="size-16 rounded-full bg-muted/80 flex items-center justify-center mb-3">
                      <QrCode className="size-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez un partenaire
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      pour voir son QR code
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMerchant ? "Modifier le partenaire" : "Nouveau partenaire"}
            </DialogTitle>
            <DialogDescription>
              {editingMerchant
                ? "Modifiez les informations du partenaire."
                : "Remplissez les informations pour ajouter un nouveau partenaire."}
            </DialogDescription>
          </DialogHeader>
          <MerchantForm
            stationId={stationId}
            merchant={
              editingMerchant
                ? {
                    id: editingMerchant.id,
                    name: editingMerchant.name,
                    description: editingMerchant.description,
                    category: editingMerchant.category,
                    whatsapp: editingMerchant.whatsapp,
                    mapsUrl: editingMerchant.mapsUrl,
                    promoText: editingMerchant.promoText,
                    promoExpiry: editingMerchant.promoExpiry,
                    logo: editingMerchant.logo,
                    isActive: editingMerchant.isActive,
                    displayOrder: editingMerchant.displayOrder,
                  }
                : undefined
            }
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ─── Mobile QR Code Bottom Sheet (dialog) ──────────────────────── */}
      <Dialog
        open={!!qrPreviewMerchant}
        onOpenChange={(open) => {
          if (!open) setQrPreviewMerchant(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          {qrPreviewMerchant && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {qrPreviewMerchant.logo ? (
                    <img
                      src={qrPreviewMerchant.logo}
                      alt={qrPreviewMerchant.name}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-semibold text-amber-700">
                      {qrPreviewMerchant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {qrPreviewMerchant.name}
                </DialogTitle>
                <DialogDescription>
                  QR Code pour la page publique de ce partenaire
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2">
                <QrCodeDisplay
                  url={`/p/${stationId}/${qrPreviewMerchant.id}`}
                  size={200}
                  label="QR Code"
                  showActions={true}
                />
                <div className="w-full rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">
                    URL publique
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">
                    {getPublicUrl(stationId, qrPreviewMerchant.id)}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
