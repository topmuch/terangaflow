'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TripDisplay, TripStatus } from '@/lib/types';
import { Clock, MapPin, Bus, AlertTriangle } from 'lucide-react';

// ── Status Configuration ──────────────────────────────────────────────

interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<TripStatus, StatusConfig> = {
  ON_TIME: {
    label: 'À l\'heure',
    bgColor: 'bg-emerald-500/15',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    pulse: false,
  },
  DELAYED: {
    label: 'Retardé',
    bgColor: 'bg-amber-500/15',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-400',
    pulse: true,
  },
  BOARDING: {
    label: 'Embarquement',
    bgColor: 'bg-blue-500/15',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-400',
    pulse: true,
  },
  DEPARTED: {
    label: 'Départé',
    bgColor: 'bg-slate-500/15',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-500',
    pulse: false,
  },
  CANCELLED: {
    label: 'Annulé',
    bgColor: 'bg-red-500/15',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    pulse: false,
  },
};

// ── Row Animation ─────────────────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// ── Trip Row Component ────────────────────────────────────────────────

function TripRow({ trip, index }: { trip: TripDisplay; index: number }) {
  const cfg = STATUS_CONFIG[trip.status];
  const isDelayed = trip.status === 'DELAYED' && trip.delayMinutes && trip.delayMinutes > 0;

  return (
    <motion.div
      layout
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`grid grid-cols-12 gap-2 md:gap-3 items-center px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-800/60 transition-colors hover:bg-slate-800/40 ${trip.status === 'CANCELLED' ? 'opacity-50' : ''}`}
    >
      {/* Col 1-2: Line Badge */}
      <div className="col-span-2 flex items-center">
        <span
          className="inline-flex items-center justify-center px-2 py-1 rounded-md text-xs md:text-sm font-black text-white shadow-sm min-w-[3rem]"
          style={{ backgroundColor: trip.lineColor }}
        >
          <Bus className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1.5 shrink-0" />
          {trip.lineCode}
        </span>
      </div>

      {/* Col 3-6: Destination */}
      <div className="col-span-4 flex items-center gap-2 min-w-0">
        <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 shrink-0" />
        <span className="text-sm md:text-base font-semibold text-white truncate">
          {trip.destination}
        </span>
      </div>

      {/* Col 7-8: Scheduled Time */}
      <div className="col-span-2 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:block" />
        <span className="text-sm md:text-base font-mono font-medium text-slate-300 tabular-nums">
          {trip.scheduledTime}
        </span>
      </div>

      {/* Col 9-10: Estimated Time */}
      <div className="col-span-2 flex items-center gap-1.5">
        {isDelayed && (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        )}
        <span
          className={`text-sm md:text-base font-mono font-bold tabular-nums ${isDelayed ? 'text-amber-400' : 'text-slate-300'}`}
        >
          {trip.estimatedTime}
        </span>
        {isDelayed && (
          <span className="text-[10px] md:text-xs text-amber-400 font-semibold">+{trip.delayMinutes}&apos;min</span>
        )}
      </div>

      {/* Col 11: Platform */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-xs md:text-sm font-bold text-slate-200 text-center">
          {trip.platform.replace('Quai ', 'Q')}
        </span>
      </div>

      {/* Col 12: Status Badge */}
      <div className="col-span-1 flex items-center justify-end">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold ${cfg.bgColor} ${cfg.textColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} ${cfg.pulse ? 'animate-pulse' : ''}`} />
          <span className="hidden xl:inline">{cfg.label}</span>
          <span className="xl:hidden">{cfg.label.slice(0, 3)}.</span>
        </span>
      </div>
    </motion.div>
  );
}

// ── Column Headers ────────────────────────────────────────────────────

function ColumnHeaders() {
  const headers = [
    { label: 'Ligne', className: 'col-span-2' },
    { label: 'Destination', className: 'col-span-4' },
    { label: 'Prévu', className: 'col-span-2' },
    { label: 'Estimé', className: 'col-span-2' },
    { label: 'Quai', className: 'col-span-1 text-center' },
    { label: 'Statut', className: 'col-span-1 text-right' },
  ];

  return (
    <div className="grid grid-cols-12 gap-2 md:gap-3 px-3 md:px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
      {headers.map((h) => (
        <span
          key={h.label}
          className={`text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider ${h.className}`}
        >
          {h.label}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

interface DeparturesTableProps {
  stationId: string;
  refreshMs?: number;
  maxRows?: number;
}

export function DeparturesTable({ stationId, refreshMs = 30000, maxRows = 50 }: DeparturesTableProps) {
  const [departures, setDepartures] = useState<TripDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch(`/api/departures/${stationId}`);
      if (!res.ok) throw new Error('Erreur serveur');
      const data: TripDisplay[] = await res.json();
      setDepartures(data.slice(0, maxRows));
      setLastUpdate(new Date());
      setError(null);
    } catch {
      setError('Impossible de charger les départs');
    } finally {
      setLoading(false);
    }
  }, [stationId, maxRows]);

  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, refreshMs);
    return () => clearInterval(interval);
  }, [fetchDepartures, refreshMs]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-slate-950 rounded-lg overflow-hidden">
        <ColumnHeaders />
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 md:gap-3 items-center px-3 md:px-4 py-3 border-b border-slate-800/40">
              <div className="col-span-2 h-7 rounded bg-slate-800 animate-pulse" />
              <div className="col-span-4 h-4 rounded bg-slate-800 animate-pulse w-3/4" />
              <div className="col-span-2 h-4 rounded bg-slate-800 animate-pulse w-12" />
              <div className="col-span-2 h-4 rounded bg-slate-800 animate-pulse w-12" />
              <div className="col-span-1 h-5 rounded bg-slate-800 animate-pulse w-8 mx-auto" />
              <div className="col-span-1 h-5 rounded bg-slate-800 animate-pulse w-14 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-slate-950 rounded-lg overflow-hidden p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium">{error}</p>
        <button
          onClick={fetchDepartures}
          className="mt-3 px-4 py-1.5 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Empty state
  if (departures.length === 0) {
    return (
      <div className="bg-slate-950 rounded-lg overflow-hidden p-8 text-center">
        <Bus className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-lg font-medium">Aucun départ prévu</p>
        <p className="text-slate-500 text-sm mt-1">Rechargement automatique en cours…</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-lg overflow-hidden max-h-[calc(100vh-280px)] flex flex-col">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-slate-900/80 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-300">
            {departures.length} départ{departures.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            {departures.filter(d => d.status === 'BOARDING').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold">
                {departures.filter(d => d.status === 'BOARDING').length} embarquement
              </span>
            )}
            {departures.filter(d => d.status === 'DELAYED').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                {departures.filter(d => d.status === 'DELAYED').length} retard{departures.filter(d => d.status === 'DELAYED').length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {lastUpdate && (
          <span className="text-[10px] text-slate-500 tabular-nums">
            MàJ {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Column Headers */}
      <ColumnHeaders />

      {/* Rows */}
      <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {departures.map((trip, i) => (
            <TripRow key={trip.id} trip={trip} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
