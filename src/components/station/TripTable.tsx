"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bus,
  Trash2,
  MoreHorizontal,
  Clock,
  MapPin,
  User,
  CheckCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TRIP_STATUS_CONFIG, TRIP_STATUS } from "@/types/signage";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────────

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

interface TripTableProps {
  stationId: string;
  trips: TripItem[];
  onUpdateStatus?: (tripId: string, status: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  TRIP_STATUS.SCHEDULED,
  TRIP_STATUS.BOARDING,
  TRIP_STATUS.DELAYED,
  TRIP_STATUS.DEPARTED,
  TRIP_STATUS.CANCELLED,
  TRIP_STATUS.ARRIVED,
] as const;

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

function getStatusConfig(status: string) {
  const key = status.toUpperCase() as keyof typeof TRIP_STATUS_CONFIG;
  return TRIP_STATUS_CONFIG[key] ?? TRIP_STATUS_CONFIG[TRIP_STATUS.SCHEDULED];
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "whitespace-nowrap text-xs font-medium",
        config.bgColor,
        config.color
      )}
    >
      {config.label}
    </Badge>
  );
}

// ─── Mobile Trip Card ──────────────────────────────────────────────────────────

function TripCard({
  trip,
  onUpdateStatus,
  onDelete,
}: {
  trip: TripItem;
  onUpdateStatus?: (tripId: string, status: string) => void;
  onDelete?: (tripId: string) => void;
}) {
  const statusConfig = getStatusConfig(trip.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          {/* Header: Line + Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold tracking-wide text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  {trip.lineCode}
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {trip.lineName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={trip.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 min-w-[36px]"
                    aria-label="Actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {STATUS_OPTIONS.map((status) => {
                    const cfg = TRIP_STATUS_CONFIG[status];
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onUpdateStatus?.(trip.id, status)}
                      >
                        <span
                          className={cn("mr-2 inline-block h-2 w-2 rounded-full", {
                            "bg-emerald-500": status === TRIP_STATUS.SCHEDULED,
                            "bg-blue-500": status === TRIP_STATUS.BOARDING,
                            "bg-amber-500": status === TRIP_STATUS.DELAYED,
                            "bg-gray-400": status === TRIP_STATUS.DEPARTED,
                            "bg-red-500": status === TRIP_STATUS.CANCELLED,
                            "bg-gray-500": status === TRIP_STATUS.ARRIVED,
                          })}
                        />
                        {cfg.label}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(trip.id)}
                    className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Details */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{trip.operatorName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{trip.platform ?? "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>{formatTime(trip.departureTime)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{formatTime(trip.estimatedArrival)}</span>
            </div>
          </div>

          {/* Notes */}
          {trip.notes && (
            <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
              {trip.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
        <Bus className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          Aucun trajet programmé
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Les trajets apparaîtront ici une fois créés ou importés.
        </p>
      </div>
    </motion.div>
  );
}

// ─── TripTable ────────────────────────────────────────────────────────────────

export default function TripTable({ stationId, trips, onUpdateStatus }: TripTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (tripId: string) => {
      setDeletingId(tripId);
      try {
        const res = await fetch(
          `/api/station/${stationId}/trips/${tripId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Erreur lors de la suppression");
        // Optimistic removal handled by parent refresh via onSuccess pattern
      } catch {
        // Silently handle; parent manages state
      } finally {
        setDeletingId(null);
      }
    },
    [stationId]
  );

  if (trips.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* ─── Mobile Cards (visible on small screens) ──────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        <AnimatePresence>
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onUpdateStatus={onUpdateStatus}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* ─── Desktop Table (hidden on small screens) ─────────────── */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wide">
                Ligne
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">
                Opérateur
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">
                Départ
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">
                Arrivée
              </TableHead>
              <TableHead className="w-[70px] text-xs font-semibold uppercase tracking-wide">
                Quai
              </TableHead>
              <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide">
                Statut
              </TableHead>
              <TableHead className="w-[60px] text-xs font-semibold uppercase tracking-wide">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {trips.map((trip) => {
                const statusConfig = getStatusConfig(trip.status);
                return (
                  <motion.tr
                    key={trip.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="group border-b transition-colors last:border-0 hover:bg-muted/30"
                  >
                    {/* Line */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-bold tracking-wide text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          {trip.lineCode}
                        </span>
                        <span className="truncate text-sm font-medium">
                          {trip.lineName}
                        </span>
                      </div>
                    </TableCell>

                    {/* Operator */}
                    <TableCell className="text-sm text-muted-foreground">
                      {trip.operatorName}
                    </TableCell>

                    {/* Departure */}
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        {formatTime(trip.departureTime)}
                      </span>
                    </TableCell>

                    {/* Arrival */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(trip.estimatedArrival)}
                    </TableCell>

                    {/* Platform */}
                    <TableCell>
                      {trip.platform ? (
                        <span className="inline-flex h-7 w-7 min-w-[28px] items-center justify-center rounded-md bg-muted text-xs font-medium">
                          {trip.platform}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={trip.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 min-w-[36px] opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Actions pour ce trajet"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {STATUS_OPTIONS.map((status) => {
                            const cfg = TRIP_STATUS_CONFIG[status];
                            const isActive =
                              trip.status.toUpperCase() === status;
                            return (
                              <DropdownMenuItem
                                key={status}
                                onClick={() =>
                                  onUpdateStatus?.(trip.id, status)
                                }
                                className={cn(isActive && "font-semibold")}
                              >
                                <span
                                  className={cn(
                                    "mr-2 inline-block h-2 w-2 rounded-full",
                                    {
                                      "bg-emerald-500":
                                        status === TRIP_STATUS.SCHEDULED,
                                      "bg-blue-500":
                                        status === TRIP_STATUS.BOARDING,
                                      "bg-amber-500":
                                        status === TRIP_STATUS.DELAYED,
                                      "bg-gray-400":
                                        status === TRIP_STATUS.DEPARTED,
                                      "bg-red-500":
                                        status === TRIP_STATUS.CANCELLED,
                                      "bg-gray-500":
                                        status === TRIP_STATUS.ARRIVED,
                                    }
                                  )}
                                />
                                {cfg.label}
                                {isActive && (
                                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(trip.id)}
                            disabled={deletingId === trip.id}
                            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingId === trip.id
                              ? "Suppression…"
                              : "Supprimer"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
