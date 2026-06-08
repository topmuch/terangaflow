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
  Volume2,
  Play,
  AlertCircle,
  Loader2,
  PlaneTakeoff,
  PlaneLanding,
  XCircle,
  Timer,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TRIP_STATUS_CONFIG, TRIP_STATUS } from "@/types/signage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  onUpdateStatus?: (tripId: string, status: string, delayMinutes?: number, reason?: string) => void;
}

// ─── Quick Action Buttons Config ─────────────────────────────────────────────────

interface QuickAction {
  status: string;
  label: string;
  icon: typeof Volume2;
  color: string;           // bg color
  hoverColor: string;      // hover bg color
  textColor: string;       // text color
  needsDelay: boolean;
  needsReason: boolean;
}

type QuickActionStatus = "DELAYED" | "CANCELLED";

const QUICK_ACTIONS: Record<QuickActionStatus, QuickAction> = {
  DELAYED: {
    status: "DELAYED",
    label: "Retard",
    icon: Timer,
    color: "bg-amber-500",
    hoverColor: "hover:bg-amber-600",
    textColor: "text-white",
    needsDelay: true,
    needsReason: false,
  },
  CANCELLED: {
    status: "CANCELLED",
    label: "Annuler",
    icon: XCircle,
    color: "bg-red-600",
    hoverColor: "hover:bg-red-700",
    textColor: "text-white",
    needsDelay: false,
    needsReason: true,
  },
};

// Get valid quick actions for a given current status
function getQuickActionsForStatus(currentStatus: string): QuickAction[] {
  const upper = currentStatus.toUpperCase();
  // Only manual actions: Delay and Cancel. Boarding/Departed/Arrived are automatic.
  switch (upper) {
    case "SCHEDULED":
    case "BOARDING":
    case "DELAYED":
      return [QUICK_ACTIONS.DELAYED, QUICK_ACTIONS.CANCELLED];
    default:
      return [];
  }
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

// ─── Delay Dialog ───────────────────────────────────────────────────────────────

function DelayDialog({
  open,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  onConfirm: (minutes: number) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [minutes, setMinutes] = useState("15");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Timer className="h-5 w-5" />
            Durée du retard
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="delay-minutes">Retard (en minutes)</Label>
            <Input
              id="delay-minutes"
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Ex: 15"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                const parsed = parseInt(minutes);
                if (parsed > 0) {
                  onConfirm(parsed);
                }
              }}
              disabled={loading || !minutes || parseInt(minutes) < 1}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              Confirmer le retard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reason Dialog ─────────────────────────────────────────────────────────────

function ReasonDialog({
  open,
  onConfirm,
  onCancel,
  loading,
  title,
}: {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
  title: string;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reason-text">Raison (obligatoire)</Label>
            <Input
              id="reason-text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Véhicule en panne"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (reason.trim()) {
                  onConfirm(reason.trim());
                }
              }}
              disabled={loading || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick Action Button ────────────────────────────────────────────────────────

function QuickActionButton({
  action,
  onClick,
  disabled,
  compact,
}: {
  action: QuickAction;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const Icon = action.icon;

  if (compact) {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "h-8 w-8 min-w-[32px]",
          !disabled && action.color,
          !disabled && action.textColor
        )}
        title={action.label}
      >
        {disabled ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 gap-1.5 px-3 text-xs font-medium border",
        !disabled && action.color,
        !disabled && action.textColor,
        !disabled && "border-transparent shadow-sm"
      )}
    >
      {disabled ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {action.label}
    </Button>
  );
}

// ─── Mobile Trip Card ──────────────────────────────────────────────────────────

function TripCard({
  trip,
  onUpdateStatus,
  onDelete,
  transitionLoading,
  showDelayDialog,
  showReasonDialog,
  pendingAction,
}: {
  trip: TripItem;
  onUpdateStatus?: (tripId: string, status: string, delayMinutes?: number, reason?: string) => void;
  onDelete?: (tripId: string) => void;
  transitionLoading: boolean;
  showDelayDialog: boolean;
  showReasonDialog: boolean;
  pendingAction: string | null;
}) {
  const statusConfig = getStatusConfig(trip.status);
  const quickActions = getQuickActionsForStatus(trip.status);

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

          {/* Quick Action Buttons */}
          {quickActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <QuickActionButton
                  key={action.status}
                  action={action}
                  onClick={() => {
                    if (action.needsDelay) {
                      // Will be handled by parent dialog state
                      onUpdateStatus?.(trip.id, action.status);
                    } else if (action.needsReason) {
                      onUpdateStatus?.(trip.id, action.status);
                    } else {
                      onUpdateStatus?.(trip.id, action.status);
                    }
                  }}
                  disabled={transitionLoading && pendingAction === action.status}
                  compact={false}
                />
              ))}
            </div>
          )}

          {/* Audio indicator */}
          {transitionLoading && pendingAction && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-violet-50 px-2.5 py-1.5 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              <Volume2 className="h-3 w-3 animate-pulse" />
              Annonce en cours de génération...
            </div>
          )}

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
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [transitioningAction, setTransitioningAction] = useState<string | null>(null);
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (tripId: string) => {
      setDeletingId(tripId);
      try {
        const res = await fetch(
          `/api/station/${stationId}/trips/${tripId}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Erreur lors de la suppression");
      } catch {
        // Silently handle; parent manages state
      } finally {
        setDeletingId(null);
      }
    },
    [stationId]
  );

  // ─── Enhanced status update with delay/reason dialogs ─────────────────────────
  const handleStatusUpdate = useCallback(
    async (tripId: string, status: string, delayMinutes?: number, reason?: string) => {
      const action = QUICK_ACTIONS[status as QuickActionStatus];

      // Show delay dialog if needed
      if (action?.needsDelay && delayMinutes === undefined) {
        setPendingTripId(tripId);
        setPendingStatus(status);
        setDelayDialogOpen(true);
        return;
      }

      // Show reason dialog if needed
      if (action?.needsReason && !reason) {
        setPendingTripId(tripId);
        setPendingStatus(status);
        setReasonDialogOpen(true);
        return;
      }

      // Execute transition
      setTransitioningId(tripId);
      setTransitioningAction(status);

      try {
        const res = await fetch(`/api/trips/${tripId}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toStatus: status,
            delayMinutes,
            reason,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Erreur" }));
          throw new Error(data.error || "Erreur lors de la transition");
        }

        const result = await res.json();
        const dispatch = result.dispatch;

        // Show success toast with audio confirmation
        const audioMsg = dispatch?.audioPayload ? " 🔊 Annonce kiosk générée" : "";
        toast.success(`Statut mis à jour${audioMsg}`);

        // Refresh parent data
        onUpdateStatus?.(tripId, status, delayMinutes, reason);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setTransitioningId(null);
        setTransitioningAction(null);
      }
    },
    [onUpdateStatus]
  );

  const handleDelayConfirm = useCallback(
    (minutes: number) => {
      setDelayDialogOpen(false);
      if (pendingTripId && pendingStatus) {
        handleStatusUpdate(pendingTripId, pendingStatus, minutes);
        setPendingTripId(null);
        setPendingStatus(null);
      }
    },
    [pendingTripId, pendingStatus, handleStatusUpdate]
  );

  const handleReasonConfirm = useCallback(
    (reason: string) => {
      setReasonDialogOpen(false);
      if (pendingTripId && pendingStatus) {
        handleStatusUpdate(pendingTripId, pendingStatus, undefined, reason);
        setPendingTripId(null);
        setPendingStatus(null);
      }
    },
    [pendingTripId, pendingStatus, handleStatusUpdate]
  );

  const handleDialogCancel = useCallback(() => {
    setDelayDialogOpen(false);
    setReasonDialogOpen(false);
    setPendingTripId(null);
    setPendingStatus(null);
  }, []);

  if (trips.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div>
        {/* ─── Mobile Cards (visible on small screens) ──────────────── */}
        <div className="flex flex-col gap-3 md:hidden">
          <AnimatePresence>
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onUpdateStatus={handleStatusUpdate}
                onDelete={handleDelete}
                transitionLoading={transitioningId === trip.id}
                showDelayDialog={delayDialogOpen}
                showReasonDialog={reasonDialogOpen}
                pendingAction={transitioningAction}
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
                <TableHead className="text-xs font-semibold uppercase tracking-wide">
                  Actions rapides
                </TableHead>
                <TableHead className="w-[50px] text-xs font-semibold uppercase tracking-wide">
                  <span className="sr-only">Menu</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {trips.map((trip) => {
                  const statusConfig = getStatusConfig(trip.status);
                  const quickActions = getQuickActionsForStatus(trip.status);
                  const isLoading = transitioningId === trip.id;

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

                      {/* Quick Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {quickActions.map((action) => (
                            <QuickActionButton
                              key={action.status}
                              action={action}
                              onClick={() => handleStatusUpdate(trip.id, action.status)}
                              disabled={isLoading}
                              compact
                            />
                          ))}
                          {isLoading && (
                            <div className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
                              <Volume2 className="h-3 w-3 animate-pulse" />
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions Menu */}
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
                          <DropdownMenuContent align="end" className="w-48">
                            {STATUS_OPTIONS.map((status) => {
                              const cfg = TRIP_STATUS_CONFIG[status];
                              const isActive =
                                trip.status.toUpperCase() === status;
                              return (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => handleStatusUpdate(trip.id, status)}
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

      {/* ─── Delay Dialog ──────────────────────────────────────────────── */}
      <DelayDialog
        open={delayDialogOpen}
        onConfirm={handleDelayConfirm}
        onCancel={handleDialogCancel}
        loading={transitioningId !== null}
      />

      {/* ─── Reason Dialog ─────────────────────────────────────────────── */}
      <ReasonDialog
        open={reasonDialogOpen}
        onConfirm={handleReasonConfirm}
        onCancel={handleDialogCancel}
        loading={transitioningId !== null}
        title={
          pendingStatus === "CANCELLED"
            ? "Raison de l'annulation"
            : "Raison"
        }
      />
    </>
  );
}
