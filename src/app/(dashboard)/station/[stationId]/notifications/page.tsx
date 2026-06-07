"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  RefreshCw,
  Megaphone,
  Bell,
  History,
  Play,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Loader2,
  Volume2,
  Monitor,
  Smartphone,
  Radio,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TRIP_STATUS_CONFIG, type TripStatus } from "@/types/signage";
import {
  getAvailableTransitions,
  isTerminalState,
  type TransitionEdge,
} from "@/lib/tripStateMachine";

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

interface NotificationRule {
  id: string;
  name: string;
  stationId: string;
  triggerFrom: string;
  triggerTo: string;
  channel: string;
  template: string;
  repeatEveryMin: number;
  repeatMaxTimes: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementItem {
  id: string;
  stationId: string;
  tripId: string | null;
  ruleId: string | null;
  channel: string;
  message: string;
  renderedMessage: string | null;
  priority: number;
  status: string;
  scheduledAt: string;
  retryCount: number;
  maxRetries: number;
  playedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TransitionLogEntry {
  id: string;
  timestamp: string;
  tripId: string;
  tripDestination: string;
  fromStatus: string;
  toStatus: string;
  triggeredBy: string | null;
  reason: string | null;
  success: boolean;
  error: string | null;
}

interface RuleFormData {
  name: string;
  triggerFrom: string;
  triggerTo: string;
  channel: string;
  template: string;
  repeatEveryMin: number;
  repeatMaxTimes: number;
  priority: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_STATUSES: { value: string; label: string }[] = [
  { value: "SCHEDULED", label: "Programmé" },
  { value: "BOARDING", label: "Embarquement" },
  { value: "DELAYED", label: "Retard" },
  { value: "DEPARTED", label: "Parti" },
  { value: "CANCELLED", label: "Annulé" },
  { value: "ARRIVED", label: "Arrivé" },
];

const CHANNELS: { value: string; label: string; icon: typeof Volume2 }[] = [
  { value: "voice", label: "Voix", icon: Volume2 },
  { value: "display", label: "Écran", icon: Monitor },
  { value: "push", label: "Push", icon: Smartphone },
  { value: "all", label: "Tous", icon: Radio },
];

const ANNOUNCEMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  playing: { label: "En cours", color: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Terminé", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  failed: { label: "Échoué", color: "bg-red-100 text-red-700 border-red-200" },
  skipped: { label: "Ignoré", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const TRANSITION_BUTTON_COLORS: Record<string, string> = {
  BOARDING: "bg-blue-600 hover:bg-blue-700 text-white",
  DEPARTED: "bg-gray-600 hover:bg-gray-700 text-white",
  DELAYED: "bg-amber-500 hover:bg-amber-600 text-white",
  CANCELLED: "bg-red-600 hover:bg-red-700 text-white",
  ARRIVED: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

const EMPTY_RULE_FORM: RuleFormData = {
  name: "",
  triggerFrom: "SCHEDULED",
  triggerTo: "BOARDING",
  channel: "voice",
  template: "",
  repeatEveryMin: 0,
  repeatMaxTimes: 0,
  priority: 0,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const upper = status.toUpperCase() as TripStatus;
  const config = TRIP_STATUS_CONFIG[upper];
  if (!config) return <Badge variant="secondary">{status}</Badge>;
  return (
    <Badge className={cn(config.bgColor, config.color, "border-0")}>
      {config.label}
    </Badge>
  );
}

function getChannelIcon(channel: string) {
  const ch = CHANNELS.find((c) => c.value === channel);
  return ch ? ch.icon : Volume2;
}

function getChannelBadge(channel: string) {
  const ch = CHANNELS.find((c) => c.value === channel);
  if (!ch) return <Badge variant="secondary">{channel}</Badge>;
  const Icon = ch.icon;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="size-3" />
      {ch.label}
    </Badge>
  );
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

// ─── Skeleton Loaders ───────────────────────────────────────────────────────────

function TripSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-36 rounded" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-11 w-32 rounded-lg" />
                <Skeleton className="h-11 w-32 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RulesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-5 w-48 rounded-full" />
                <Skeleton className="h-4 w-full max-w-xs rounded" />
              </div>
              <Skeleton className="h-9 w-16 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function LogsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-4 flex-1 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Transition Reason Dialog ─────────────────────────────────────────────────

function TransitionReasonDialog({
  open,
  onOpenChange,
  tripInfo,
  edge,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripInfo: string;
  edge: TransitionEdge;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer la transition</DialogTitle>
          <DialogDescription>
            {tripInfo} — {edge.label}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="transition-reason">
              Raison <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="transition-reason"
              placeholder="Indiquez la raison de cette transition..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Cette information sera enregistrée dans le journal des transitions.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                onConfirm(reason);
                setReason("");
              }}
              disabled={loading || !reason.trim()}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Confirmer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Rule Form ─────────────────────────────────────────────────────────────────

function RuleForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial: RuleFormData;
  onSubmit: (data: RuleFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<RuleFormData>(initial);

  function update(partial: Partial<RuleFormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  const isValid =
    form.name.trim().length >= 2 &&
    form.template.trim().length >= 3 &&
    form.triggerFrom !== form.triggerTo;

  return (
    <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="rule-name">Nom de la règle</Label>
        <Input
          id="rule-name"
          placeholder="Ex: Annonce d'embarquement"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          maxLength={120}
        />
      </div>

      {/* Trigger From/To */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="rule-from">Statut source</Label>
          <Select
            value={form.triggerFrom}
            onValueChange={(v) => update({ triggerFrom: v })}
          >
            <SelectTrigger id="rule-from">
              <SelectValue placeholder="De..." />
            </SelectTrigger>
            <SelectContent>
              {TRIP_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-to">Statut cible</Label>
          <Select
            value={form.triggerTo}
            onValueChange={(v) => update({ triggerTo: v })}
          >
            <SelectTrigger id="rule-to">
              <SelectValue placeholder="Vers..." />
            </SelectTrigger>
            <SelectContent>
              {TRIP_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Channel */}
      <div className="space-y-2">
        <Label htmlFor="rule-channel">Canal</Label>
        <Select
          value={form.channel}
          onValueChange={(v) => update({ channel: v })}
        >
          <SelectTrigger id="rule-channel">
            <SelectValue placeholder="Choisir un canal" />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((ch) => (
              <SelectItem key={ch.value} value={ch.value}>
                <span className="flex items-center gap-2">
                  <ch.icon className="size-4" />
                  {ch.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template */}
      <div className="space-y-2">
        <Label htmlFor="rule-template">Template du message</Label>
        <Textarea
          id="rule-template"
          placeholder="Le départ pour {destination} est annoncé à quai {platform}"
          value={form.template}
          onChange={(e) => update({ template: e.target.value })}
          rows={3}
          maxLength={500}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Variables disponibles :{" "}
          <code className="bg-muted px-1 rounded text-xs">{'{destination}'}</code>,{" "}
          <code className="bg-muted px-1 rounded text-xs">{'{platform}'}</code>,{" "}
          <code className="bg-muted px-1 rounded text-xs">{'{delay}'}</code>,{" "}
          <code className="bg-muted px-1 rounded text-xs">{'{operator}'}</code>,{" "}
          <code className="bg-muted px-1 rounded text-xs">{'{lineCode}'}</code>
        </p>
      </div>

      {/* Repeat & Priority */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="rule-repeat-every">Rép. (min)</Label>
          <Input
            id="rule-repeat-every"
            type="number"
            min={0}
            max={60}
            value={form.repeatEveryMin}
            onChange={(e) =>
              update({ repeatEveryMin: parseInt(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-muted-foreground">0 = aucune</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-repeat-max">Nb. max</Label>
          <Input
            id="rule-repeat-max"
            type="number"
            min={0}
            max={20}
            value={form.repeatMaxTimes}
            onChange={(e) =>
              update({ repeatMaxTimes: parseInt(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-muted-foreground">0 = illimité</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-priority">Priorité</Label>
          <Input
            id="rule-priority"
            type="number"
            min={0}
            max={100}
            value={form.priority}
            onChange={(e) =>
              update({ priority: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={loading || !isValid}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Créer la règle
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Empty State Component ──────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Megaphone;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-12">
      <div className="size-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <Icon className="size-6 text-amber-500" />
      </div>
      <h3 className="text-lg font-medium text-muted-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-md">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function NotificationsControlCenterPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  // ─── State: Trips ─────────────────────────────────────────────────────────
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  // ─── State: Rules ─────────────────────────────────────────────────────────
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleFormLoading, setRuleFormLoading] = useState(false);

  // ─── State: Announcements ─────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  // ─── State: Transition Logs (local) ───────────────────────────────────────
  const [transitionLogs, setTransitionLogs] = useState<TransitionLogEntry[]>([]);

  // ─── State: Transition Dialog ────────────────────────────────────────────
  const [transitionDialog, setTransitionDialog] = useState<{
    open: boolean;
    tripId: string;
    tripDestination: string;
    edge: TransitionEdge;
    loading: boolean;
  } | null>(null);

  // ─── Polling refs ─────────────────────────────────────────────────────────
  const announcementsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch trips ──────────────────────────────────────────────────────────

  const fetchTrips = useCallback(async () => {
    try {
      setTripsLoading(true);
      const res = await fetch(`/api/station/${stationId}/trips`);
      if (!res.ok) throw new Error("Erreur lors du chargement des trajets");
      const data: TripItem[] = await res.json();
      setTrips(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setTripsLoading(false);
    }
  }, [stationId]);

  // ─── Fetch rules ──────────────────────────────────────────────────────────

  const fetchRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      const res = await fetch(
        `/api/station/${stationId}/notifications/rules`
      );
      if (!res.ok)
        throw new Error("Erreur lors du chargement des règles");
      const data: NotificationRule[] = await res.json();
      setRules(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setRulesLoading(false);
    }
  }, [stationId]);

  // ─── Fetch announcements ───────────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      const res = await fetch(
        `/api/station/${stationId}/announcements?status=pending`
      );
      if (!res.ok)
        throw new Error("Erreur lors du chargement des annonces");
      const data: AnnouncementItem[] = await res.json();
      setAnnouncements(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [stationId]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    fetchAnnouncements();

    // Poll every 15 seconds
    announcementsIntervalRef.current = setInterval(() => {
      fetchAnnouncements();
    }, 15_000);

    return () => {
      if (announcementsIntervalRef.current) {
        clearInterval(announcementsIntervalRef.current);
      }
    };
  }, [fetchAnnouncements]);

  // ─── Handle Transition ────────────────────────────────────────────────────

  function handleTransitionClick(trip: TripItem, edge: TransitionEdge) {
    if (edge.requiresReason) {
      setTransitionDialog({
        open: true,
        tripId: trip.id,
        tripDestination: trip.lineName,
        edge,
        loading: false,
      });
    } else {
      executeTransition(trip.id, trip.lineName, edge, undefined);
    }
  }

  async function executeTransition(
    tripId: string,
    tripDestination: string,
    edge: TransitionEdge,
    reason: string | undefined
  ) {
    try {
      // Set loading on dialog if open
      if (transitionDialog) {
        setTransitionDialog({ ...transitionDialog, loading: true });
      }

      const body: { toStatus: string; reason?: string } = {
        toStatus: edge.to,
      };
      if (reason) {
        body.reason = reason;
      }

      const res = await fetch(`/api/trips/${tripId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // Log the error
        setTransitionLogs((prev) => [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            tripId,
            tripDestination,
            fromStatus: edge.from,
            toStatus: edge.to,
            triggeredBy: "utilisateur",
            reason: reason ?? null,
            success: false,
            error: data.error ?? "Erreur inconnue",
          },
          ...prev,
        ]);
        throw new Error(data.error ?? "Erreur lors de la transition");
      }

      // Log success
      setTransitionLogs((prev) => [
        {
          id: data.transitionLog?.id ?? crypto.randomUUID(),
          timestamp: data.transitionLog?.createdAt ?? new Date().toISOString(),
          tripId,
          tripDestination,
          fromStatus: data.transitionLog?.fromStatus ?? edge.from,
          toStatus: data.transitionLog?.toStatus ?? edge.to,
          triggeredBy: data.transitionLog?.triggeredBy ?? "utilisateur",
          reason: reason ?? null,
          success: true,
          error: null,
        },
        ...prev,
      ]);

      // Show dispatch results if any
      if (data.dispatch?.rulesMatched > 0) {
        toast.success(
          `${edge.label} — ${data.dispatch.announcementsCreated} annonce(s) programmée(s)`,
          { description: `${data.dispatch.rulesMatched} règle(s) correspondante(s)` }
        );
      } else {
        toast.success(`${edge.label} appliqué avec succès`);
      }

      // Refresh trips and announcements
      fetchTrips();
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setTransitionDialog(null);
    }
  }

  // ─── Handle Rule Creation ─────────────────────────────────────────────────

  async function handleCreateRule(form: RuleFormData) {
    try {
      setRuleFormLoading(true);

      const res = await fetch(
        `/api/station/${stationId}/notifications/rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ??
            "Erreur lors de la création de la règle"
        );
      }

      toast.success("Règle créée avec succès");
      setRuleDialogOpen(false);
      fetchRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setRuleFormLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Centre de Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les transitions d&apos;état, les règles d&apos;annonces et la
          file de diffusion en temps réel
        </p>
      </div>

      <Separator />

      {/* Main 2-column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Section 1: Trip State Control (Full width on top, left on lg) ─── */}
        <section className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Play className="size-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Contrôle des Trajets</h2>
          </div>

          {tripsLoading ? (
            <TripSkeleton />
          ) : trips.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Aucun trajet à venir"
              description="Il n'y a aucun trajet programmé pour cette gare actuellement."
            />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {trips.map((trip) => {
                  const transitions = getAvailableTransitions(trip.status);
                  const isTerminal = isTerminalState(trip.status);

                  return (
                    <motion.div
                      key={trip.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            {/* Trip Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm truncate">
                                  {trip.lineName}
                                </span>
                                {getStatusBadge(trip.status)}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                <span>{trip.operatorName}</span>
                                <span className="text-muted-foreground/40">|</span>
                                <span>
                                  {formatTime(trip.departureTime)}
                                </span>
                                {trip.platform && (
                                  <>
                                    <span className="text-muted-foreground/40">
                                      |
                                    </span>
                                    <span>
                                      Quai {trip.platform}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Transition Buttons */}
                            <div className="flex flex-wrap gap-2">
                              {transitions.length > 0 ? (
                                transitions.map((edge) => (
                                  <Button
                                    key={`${edge.from}-${edge.to}`}
                                    variant="secondary"
                                    className={cn(
                                      "min-h-[44px] min-w-[44px] text-sm font-medium",
                                      TRANSITION_BUTTON_COLORS[edge.to] ??
                                        ""
                                    )}
                                    onClick={() =>
                                      handleTransitionClick(trip, edge)
                                    }
                                    disabled={transitionDialog?.loading}
                                  >
                                    {edge.label}
                                  </Button>
                                ))
                              ) : isTerminal ? (
                                <Badge
                                  variant="secondary"
                                  className="min-h-[44px] flex items-center px-3"
                                >
                                  <CheckCircle2 className="size-4 mr-1.5 text-emerald-500" />
                                  État terminal
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="min-h-[44px] flex items-center px-3"
                                >
                                  Aucune transition disponible
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ─── Section 2: Notification Rules ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-amber-500" />
              <h2 className="text-lg font-semibold">
                Règles de Notification
              </h2>
            </div>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white min-h-[44px]"
              onClick={() => setRuleDialogOpen(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nouvelle règle</span>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4 -mt-2">
            Configurez les annonces automatiques pour chaque transition
          </p>

          {rulesLoading ? (
            <RulesSkeleton />
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Aucune règle configurée"
              description="Créez votre première règle pour déclencher automatiquement des annonces lors des changements d'état."
              action={
                <Button
                  variant="outline"
                  className="border-amber-300 text-amber-600 hover:bg-amber-50"
                  onClick={() => setRuleDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  Créer une règle
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {rules.map((rule) => (
                  <motion.div
                    key={rule.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={cn(
                        !rule.isActive && "opacity-60"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* Rule Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate">
                                {rule.name}
                              </span>
                              {!rule.isActive && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  Inactive
                                </Badge>
                              )}
                            </div>

                            {/* Trigger: from → to */}
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(rule.triggerFrom)}
                              <ChevronDown className="size-3.5 text-muted-foreground rotate-90" />
                              {getStatusBadge(rule.triggerTo)}
                            </div>

                            {/* Channel */}
                            <div>{getChannelBadge(rule.channel)}</div>

                            {/* Template */}
                            <div className="bg-muted rounded-md p-2">
                              <code className="text-xs font-mono break-all leading-relaxed">
                                {rule.template}
                              </code>
                            </div>

                            {/* Repeat info */}
                            <p className="text-xs text-muted-foreground">
                              {rule.repeatEveryMin > 0
                                ? `Répète toutes les ${rule.repeatEveryMin} min (${rule.repeatMaxTimes > 0 ? `${rule.repeatMaxTimes} fois max` : "illimité"})`
                                : "Aucune répétition"}
                            </p>
                          </div>

                          {/* Priority badge */}
                          <div className="shrink-0">
                            <Badge variant="outline" className="text-xs">
                              Priorité {rule.priority}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* ─── Section 3: Announcement Queue ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="size-5 text-amber-500" />
              <h2 className="text-lg font-semibold">File d&apos;Annonces</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={fetchAnnouncements}
            >
              <RefreshCw className="size-4" />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4 -mt-2">
            Suivi en temps réel des annonces en attente —{" "}
            <span className="text-xs">
              actualisation automatique toutes les 15s
            </span>
          </p>

          {announcementsLoading ? (
            <AnnouncementsSkeleton />
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="File vide"
              description="Aucune annonce en attente. Les annonces apparaîtront ici lorsqu'elles seront programmées par les règles de notification."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {announcements.map((announcement) => {
                      const statusConfig =
                        ANNOUNCEMENT_STATUS_CONFIG[announcement.status] ??
                        { label: announcement.status, color: "" };
                      const ChannelIcon =
                        getChannelIcon(announcement.channel);

                      return (
                        <motion.div
                          key={announcement.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              <ChannelIcon className="size-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm break-words leading-relaxed">
                                {announcement.renderedMessage ??
                                  announcement.message}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    statusConfig.color
                                  )}
                                >
                                  {statusConfig.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(announcement.scheduledAt)}
                                </span>
                                {announcement.retryCount > 0 && (
                                  <span className="text-xs text-amber-600">
                                    {announcement.retryCount} tentative(s)
                                  </span>
                                )}
                                {announcement.error && (
                                  <span className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="size-3" />
                                    {announcement.error}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                            >
                              P{announcement.priority}
                            </Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ─── Section 4: Transition Logs (Full width) ──────────────────── */}
        <section className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <History className="size-5 text-amber-500" />
            <h2 className="text-lg font-semibold">
              Journal des Transitions
            </h2>
          </div>

          <p className="text-sm text-muted-foreground mb-4 -mt-2">
            Historique des changements d&apos;état effectués dans cette session
          </p>

          {transitionLogs.length === 0 ? (
            <EmptyState
              icon={History}
              title="Aucune transition enregistrée"
              description="Les transitions effectuées sur cette page apparaîtront ici en temps réel."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    <AnimatePresence mode="popLayout">
                      {transitionLogs.map((log) => (
                        <motion.div
                          key={log.id}
                          layout
                          initial={{ opacity: 0, y: -12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                          className={cn(
                            "p-3 border-l-4 transition-colors",
                            log.success
                              ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5"
                              : "border-l-red-500 bg-red-50/50 dark:bg-red-500/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              {log.success ? (
                                <CheckCircle2 className="size-4 text-emerald-600" />
                              ) : (
                                <XCircle className="size-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">
                                  {log.tripDestination}
                                </span>
                                {getStatusBadge(log.fromStatus)}
                                <ChevronDown className="size-3.5 text-muted-foreground rotate-90" />
                                {getStatusBadge(log.toStatus)}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span>{formatDateTime(log.timestamp)}</span>
                                {log.triggeredBy && (
                                  <span>par {log.triggeredBy}</span>
                                )}
                                {log.reason && (
                                  <span className="italic">
                                    — {log.reason}
                                  </span>
                                )}
                              </div>
                              {log.error && (
                                <p className="text-xs text-red-600 mt-1">
                                  {log.error}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* ─── Transition Reason Dialog ─────────────────────────────────────── */}
      {transitionDialog && (
        <TransitionReasonDialog
          open={transitionDialog.open}
          onOpenChange={(open) => {
            if (!open) setTransitionDialog(null);
          }}
          tripInfo={transitionDialog.tripDestination}
          edge={transitionDialog.edge}
          onConfirm={(reason) => {
            executeTransition(
              transitionDialog.tripId,
              transitionDialog.tripDestination,
              transitionDialog.edge,
              reason
            );
          }}
          loading={transitionDialog.loading}
        />
      )}

      {/* ─── Create Rule Dialog ───────────────────────────────────────────── */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle règle de notification</DialogTitle>
            <DialogDescription>
              Configurez un déclencheur automatique pour les annonces lors des
              transitions d&apos;état.
            </DialogDescription>
          </DialogHeader>
          <RuleForm
            key="new-rule"
            initial={{ ...EMPTY_RULE_FORM }}
            onSubmit={handleCreateRule}
            onCancel={() => setRuleDialogOpen(false)}
            loading={ruleFormLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
