"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Bus,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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

import LineForm from "@/components/station/LineForm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  tripCount?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(isActive: boolean) {
  return isActive ? (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
      Actif
    </Badge>
  ) : (
    <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-200">
      Inactif
    </Badge>
  );
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────────

function LinesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-20 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-36" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StationLinesPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  const [lines, setLines] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<LineItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchLines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/station/${stationId}/lines`);
      if (!res.ok) throw new Error("Erreur lors du chargement des lignes");
      const data = await res.json();
      setLines(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/station/${stationId}/lines/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      toast.success("Ligne supprimée avec succès");
      setDeletingId(null);
      fetchLines();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  // ─── Dialog handlers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditingLine(null);
    setDialogOpen(true);
  }

  function openEdit(line: LineItem) {
    setEditingLine(line);
    setDialogOpen(true);
  }

  function handleFormSuccess() {
    setDialogOpen(false);
    setEditingLine(null);
    fetchLines();
    toast.success(
      editingLine ? "Ligne modifiée avec succès" : "Ligne créée avec succès"
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lignes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les lignes de transport de votre gare
          </p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="size-4" />
          Nouvelle ligne
        </Button>
      </div>

      <Separator />

      {/* Desktop table */}
      {loading ? (
        <>
          <div className="hidden md:block">
            <LinesSkeleton />
          </div>
          <div className="md:hidden">
            <CardsSkeleton />
          </div>
        </>
      ) : lines.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Bus className="size-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            Aucune ligne
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Commencez par créer votre première ligne de transport.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-4 border-amber-300 text-amber-600 hover:bg-amber-50"
          >
            <Plus className="size-4" />
            Créer une ligne
          </Button>
        </Card>
      ) : (
        <>
          {/* Desktop: table view */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Départs</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {lines.map((line) => (
                    <motion.tr
                      key={line.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      <TableCell className="font-mono font-semibold text-amber-600">
                        {line.code}
                      </TableCell>
                      <TableCell className="font-medium">{line.name}</TableCell>
                      <TableCell>{statusBadge(line.isActive)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {line.tripCount ?? 0}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(line)}>
                              <Pencil className="size-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setDeletingId(line.id);
                                  }}
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer la ligne {line.name} ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action désactivera la ligne. Les départs associés ne seront plus visibles.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeletingId(null)}>
                                    Annuler
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(line.id)}
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

          {/* Mobile: card view */}
          <div className="md:hidden grid gap-3">
            <AnimatePresence>
              {lines.map((line) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-semibold text-amber-600 text-sm">
                              {line.code}
                            </span>
                            {statusBadge(line.isActive)}
                          </div>
                          <p className="font-medium truncate">{line.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {line.tripCount ?? 0} départs
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(line)}
                          >
                            <Pencil className="size-4" />
                          </Button>
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
                                <AlertDialogTitle>Supprimer la ligne {line.name} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action désactivera la ligne. Les départs associés ne seront plus visibles.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(line.id)}
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
        </>
      )}

      {/* LineForm Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLine ? "Modifier la ligne" : "Nouvelle ligne"}
            </DialogTitle>
            <DialogDescription>
              {editingLine
                ? "Modifiez les informations de la ligne."
                : "Remplissez les informations pour créer une nouvelle ligne."}
            </DialogDescription>
          </DialogHeader>
          <LineForm
            stationId={stationId}
            line={editingLine ?? undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
