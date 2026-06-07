"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import type { DepartureItem } from "@/types/signage";
import { TRIP_STATUS_CONFIG, TRIP_STATUS } from "@/types/signage";

interface DeparturesTableProps {
  departures: DepartureItem[];
  isLoading: boolean;
  error: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatMinutes(minutes: number): string {
  if (minutes < 0) return "Parti";
  if (minutes === 0) return "Maintenant";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isUrgent(departure: DepartureItem): boolean {
  return (
    departure.minutesUntilDeparture >= 0 &&
    departure.minutesUntilDeparture <= 10 &&
    departure.status !== TRIP_STATUS.DEPARTED &&
    departure.status !== TRIP_STATUS.CANCELLED
  );
}

function getStatusBadge(status: DepartureItem["status"]) {
  const config = TRIP_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${config.color} ${config.bgColor}`}
    >
      {config.label}
    </span>
  );
}

// ─── Row Animation Variants ─────────────────────────────────────────────────────

const rowVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function DeparturesTable({ departures, isLoading, error }: DeparturesTableProps) {
  // Filter to show only future departures (or recently departed)
  const visibleDepartures = departures.filter(
    (d) =>
      d.status !== TRIP_STATUS.DEPARTED &&
      d.status !== TRIP_STATUS.ARRIVED &&
      d.minutesUntilDeparture >= -15
  );

  return (
    <section className="flex-1 overflow-hidden flex flex-col">
      {/* Section header */}
      <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b">
        <Clock className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-bold">Prochains Départs</h2>
        <span className="text-xs text-muted-foreground font-mono ml-auto">
          {visibleDepartures.length} trajet{visibleDepartures.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr_1.2fr_0.8fr_1fr_0.8fr] gap-2 px-6 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
        <span>Destination</span>
        <span>Transporteur</span>
        <span className="text-center">Départ</span>
        <span className="text-center">Compt. à rebours</span>
        <span className="text-center">Statut</span>
      </div>

      {/* Table body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-amber-500" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertTriangle className="h-10 w-10" />
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs text-muted-foreground">
              Vérifiez la connexion et réessayez.
            </p>
          </div>
        )}

        {!isLoading && !error && visibleDepartures.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">
              Aucun départ à afficher.
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {visibleDepartures.map((departure) => (
            <motion.div
              key={departure.id}
              variants={rowVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              layout
              className={`grid grid-cols-[2fr_1.2fr_0.8fr_1fr_0.8fr] gap-2 items-center px-6 py-4 border-b transition-colors ${
                isUrgent(departure)
                  ? "bg-amber-50 dark:bg-amber-500/10 border-l-4 border-l-amber-500"
                  : "bg-white dark:bg-gray-900 border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              {/* Destination */}
              <div className="min-w-0">
                <p className="text-2xl font-bold truncate leading-tight">
                  {departure.destination}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {departure.lineCode}
                </p>
              </div>

              {/* Operator */}
              <p className="text-base text-muted-foreground truncate">
                {departure.operatorName}
              </p>

              {/* Departure time */}
              <p className="text-xl font-mono font-semibold text-center tabular-nums">
                {formatTime(departure.departureTime)}
              </p>

              {/* Countdown */}
              <div className="text-center">
                {departure.minutesUntilDeparture <= 10 &&
                departure.minutesUntilDeparture >= 0 ? (
                  <span className="inline-flex items-center gap-1 text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                    </span>
                    {formatMinutes(departure.minutesUntilDeparture)}
                  </span>
                ) : (
                  <span className="text-lg font-mono font-medium tabular-nums">
                    {formatMinutes(departure.minutesUntilDeparture)}
                  </span>
                )}
              </div>

              {/* Platform + Status */}
              <div className="flex flex-col items-center gap-1">
                {departure.platform && (
                  <span className="text-xs font-mono text-muted-foreground">
                    Quai {departure.platform}
                  </span>
                )}
                {getStatusBadge(departure.status)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
