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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StationTripsPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [lineOptions, setLineOptions] = useState<{ id: string; code: string; name: string }[]>([]);

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

  async function handleUpdateStatus(tripId: string, status: string) {
    try {
      const res = await fetch(`/api/station/${stationId}/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      toast.success("Statut mis à jour avec succès");
      fetchTrips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    }
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
        <Link href={`/station/${stationId}/trips/import`}>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            <Upload className="size-4" />
            Importer des trajets
          </Button>
        </Link>
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
          <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <ArrowLeft className="size-6 text-amber-500" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">
            Aucun départ
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-md">
            {selectedLineId !== "all"
              ? "Aucun départ trouvé pour cette ligne. Essayez un autre filtre ou importez des trajets."
              : "Aucun départ enregistré. Importez un fichier CSV pour commencer."}
          </p>
          <Link href={`/station/${stationId}/trips/import`}>
            <Button
              variant="outline"
              className="mt-4 border-amber-300 text-amber-600 hover:bg-amber-50"
            >
              <Upload className="size-4" />
              Importer des trajets
            </Button>
          </Link>
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
