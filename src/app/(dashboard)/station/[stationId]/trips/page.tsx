"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Filter,
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Clock,
  MapPin,
  Bus,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import TripTable from "@/components/station/TripTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripItem {
  id: string;
  operatorName: string;
  departureTime: string;
  estimatedArrival: string;
  status: string;
  platform: string | null;
  lineCode: string;
  lineName: string;
  notes: string | null;
}

interface LineOption {
  id: string;
  code: string;
  name: string;
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────────

function TripsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-10 w-16 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Create Trip Form ──────────────────────────────────────────────────────────

function CreateTripForm({
  stationId,
  lines,
  onSuccess,
  onCancel,
}: {
  stationId: string;
  lines: LineOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [lineId, setLineId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [platform, setPlatform] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lineId || !operatorName || !departureTime || !estimatedArrival) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/station/${stationId}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId,
          operatorName,
          departureTime: new Date(departureTime).toISOString(),
          estimatedArrival: new Date(estimatedArrival).toISOString(),
          platform: platform || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erreur" }));
        throw new Error(data.error || "Erreur lors de la création");
      }

      toast.success("Trajet créé avec succès");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Line */}
      <div className="space-y-2">
        <Label htmlFor="lineId" className="flex items-center gap-2">
          <Bus className="h-4 w-4 text-violet-500" />
          Ligne <span className="text-destructive">*</span>
        </Label>
        <Select value={lineId} onValueChange={setLineId}>
          <SelectTrigger id="lineId">
            <SelectValue placeholder="Sélectionner une ligne" />
          </SelectTrigger>
          <SelectContent>
            {lines.map((line) => (
              <SelectItem key={line.id} value={line.id}>
                {line.code} — {line.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Operator */}
      <div className="space-y-2">
        <Label htmlFor="operatorName" className="flex items-center gap-2">
          <User className="h-4 w-4 text-violet-500" />
          Transporteur <span className="text-destructive">*</span>
        </Label>
        <Input
          id="operatorName"
          placeholder="Ex: SATAS, Diaspora Bus..."
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          required
        />
      </div>

      {/* Departure & Arrival times */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="departureTime" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            Heure départ <span className="text-destructive">*</span>
          </Label>
          <Input
            id="departureTime"
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimatedArrival" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Heure arrivée <span className="text-destructive">*</span>
          </Label>
          <Input
            id="estimatedArrival"
            type="datetime-local"
            value={estimatedArrival}
            onChange={(e) => setEstimatedArrival(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Platform */}
      <div className="space-y-2">
        <Label htmlFor="platform" className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-rose-500" />
          Quai
        </Label>
        <Input
          id="platform"
          placeholder="Ex: A1, B3..."
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Créer le trajet
        </Button>
      </div>
    </form>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StationTripsPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [lineOptions, setLineOptions] = useState<LineOption[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // ─── Fetch trips ────────────────────────────────────────────────────────────

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        selectedLineId === "all"
          ? `/api/station/${stationId}/trips`
          : `/api/station/${stationId}/trips?lineId=${selectedLineId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur lors du chargement des trajets");
      const data = await res.json();
      setTrips(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [stationId, selectedLineId]);

  // ─── Fetch lines for filter dropdown ─────────────────────────────────────────

  const fetchLines = useCallback(async () => {
    try {
      const res = await fetch(`/api/station/${stationId}/lines`);
      if (!res.ok) return;
      const data = await res.json();
      setLineOptions(data.map((l: { id: string; code: string; name: string }) => l));
    } catch {
      // Silently fail – filter is optional
    }
  }, [stationId]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // ─── Update status ───────────────────────────────────────────────────────────

  async function handleUpdateStatus(tripId: string, _status: string, _delayMinutes?: number, _reason?: string) {
    // The TripTable handles the actual API call via /api/trips/[tripId]/transition
    // This callback is called after success to refresh the list
    fetchTrips();
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Départs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consultez et gérez les départs de votre gare
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                <Plus className="size-4" />
                Nouveau trajet
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-violet-500" />
                  Créer un trajet
                </DialogTitle>
              </DialogHeader>
              <CreateTripForm
                stationId={stationId}
                lines={lineOptions}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchTrips();
                }}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
          <Link href={`/station/${stationId}/trips/import`}>
            <Button variant="outline">
              <Upload className="size-4" />
              Importer
            </Button>
          </Link>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      {lineOptions.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="size-4 text-muted-foreground" />
          <Select
            value={selectedLineId}
            onValueChange={setSelectedLineId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par ligne" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les lignes</SelectItem>
              {lineOptions.map((line) => (
                <SelectItem key={line.id} value={line.id}>
                  {line.code} — {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <TripsSkeleton />
      ) : trips.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <div className="size-12 rounded-full bg-violet-100 flex items-center justify-center mb-4">
            <ArrowLeft className="size-6 text-violet-500" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">
            Aucun départ
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-md">
            {selectedLineId !== "all"
              ? "Aucun départ trouvé pour cette ligne. Essayez un autre filtre ou créez un nouveau trajet."
              : "Aucun départ enregistré. Créez un trajet ou importez un fichier CSV pour commencer."}
          </p>
          <div className="flex gap-2 mt-4">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
                  <Plus className="size-4" />
                  Créer un trajet
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-violet-500" />
                    Créer un trajet
                  </DialogTitle>
                </DialogHeader>
                <CreateTripForm
                  stationId={stationId}
                  lines={lineOptions}
                  onSuccess={() => {
                    setShowCreateDialog(false);
                    fetchTrips();
                  }}
                  onCancel={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
            <Link href={`/station/${stationId}/trips/import`}>
              <Button variant="outline">
                <Upload className="size-4" />
                Importer CSV
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedLineId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <TripTable
              stationId={stationId}
              trips={trips}
              onUpdateStatus={handleUpdateStatus}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
