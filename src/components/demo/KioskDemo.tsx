'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus,
  Train,
  Clock,
  MapPin,
  Pause,
  Play,
  Zap,
  Store,
  UtensilsCrossed,
  Coffee,
  Shield,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type DepartureStatus = 'on_time' | 'boarding' | 'delayed' | 'departed' | 'cancelled';

interface Departure {
  id: string;
  line: string;
  lineColor: string;
  lineGradient: string;
  lineBg: string;
  destination: string;
  time: string;       // HH:MM
  platform: string;
  status: DepartureStatus;
  vehicle: 'bus' | 'train';
  notes?: string;
}

interface TickerMessage {
  id: string;
  text: string;
  type: 'info' | 'alert' | 'weather' | 'ad';
  icon: string;
}

interface PartnerAd {
  id: string;
  name: string;
  offer: string;
  icon: React.ReactNode;
  gradient: string;
  border: string;
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & MOCK DATA
   ═══════════════════════════════════════════════════════════ */

function getTimePlusMinutes(minutes: number): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const LINE_CONFIGS = [
  { line: 'L10', lineColor: 'text-sky-400', lineGradient: 'from-sky-500 to-blue-600', lineBg: 'bg-sky-500/15 border-sky-500/40' },
  { line: 'L24', lineColor: 'text-emerald-400', lineGradient: 'from-emerald-500 to-teal-600', lineBg: 'bg-emerald-500/15 border-emerald-500/40' },
  { line: 'L05', lineColor: 'text-amber-400', lineGradient: 'from-amber-500 to-orange-600', lineBg: 'bg-amber-500/15 border-amber-500/40' },
  { line: 'L32', lineColor: 'text-rose-400', lineGradient: 'from-rose-500 to-pink-600', lineBg: 'bg-rose-500/15 border-rose-500/40' },
  { line: 'L18', lineColor: 'text-violet-400', lineGradient: 'from-violet-500 to-purple-600', lineBg: 'bg-violet-500/15 border-violet-500/40' },
  { line: 'L07', lineColor: 'text-cyan-400', lineGradient: 'from-cyan-500 to-sky-600', lineBg: 'bg-cyan-500/15 border-cyan-500/40' },
];

const DESTINATIONS = [
  { name: 'Dakar Plateau', vehicle: 'bus' as const },
  { name: 'Thiès', vehicle: 'bus' as const },
  { name: 'Mbour Saly', vehicle: 'bus' as const },
  { name: 'Saint-Louis', vehicle: 'bus' as const },
  { name: 'Ziguinchor', vehicle: 'bus' as const },
  { name: 'Kaolack', vehicle: 'bus' as const },
  { name: 'Tambacounda', vehicle: 'bus' as const },
  { name: 'Kolda', vehicle: 'bus' as const },
  { name: 'Rufisque', vehicle: 'bus' as const },
  { name: 'Louga', vehicle: 'bus' as const },
  { name: 'Diourbel', vehicle: 'bus' as const },
  { name: 'Fatick', vehicle: 'bus' as const },
];

const PLATFORMS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'];

function generateInitialDepartures(): Departure[] {
  const offsets = [2, 5, 8, 14, 22, 35];
  const usedConfigs = LINE_CONFIGS.slice(0, 6);
  const usedDests = DESTINATIONS.slice(0, 6);

  return offsets.map((offset, i) => ({
    id: `dep-${i}-${Date.now()}`,
    line: usedConfigs[i].line,
    lineColor: usedConfigs[i].lineColor,
    lineGradient: usedConfigs[i].lineGradient,
    lineBg: usedConfigs[i].lineBg,
    destination: usedDests[i].name,
    time: getTimePlusMinutes(offset),
    platform: PLATFORMS[i],
    status: (i < 2 ? 'boarding' : 'on_time') as DepartureStatus,
    vehicle: usedDests[i].vehicle,
  }));
}

const INITIAL_TICKER: TickerMessage[] = [
  { id: 't1', text: 'Bienvenue à la Gare Routière Diamniadio — Prochains départs ci-dessous', type: 'info', icon: '🚉' },
  { id: 't2', text: 'Météo Dakar : 28°C, Ensoleillé — Prévoyez de l\'eau pour le voyage', type: 'weather', icon: '☀️' },
  { id: 't3', text: 'Restaurant Le Terminus : -10% sur le menu du jour avec votre billet TerangaFlow', type: 'ad', icon: '🍽️' },
  { id: 't4', text: 'Retard signalé sur la Ligne L24 vers Thiès — Départ repoussé à 10:45', type: 'alert', icon: '⚠️' },
  { id: 't5', text: 'WiFi Gratuit disponible — Connectez-vous au réseau "TerangaFlow_Free"', type: 'info', icon: '📶' },
];

const PARTNER_ADS: PartnerAd[] = [
  { id: 'p1', name: 'Le Terminus', offer: '-10% Menu du jour', icon: <UtensilsCrossed className="w-5 h-5" />, gradient: 'from-orange-500/10 to-amber-500/5', border: 'border-orange-500/20' },
  { id: 'p2', name: 'Café Touba Express', offer: 'Café à 200 FCFA', icon: <Coffee className="w-5 h-5" />, gradient: 'from-amber-500/10 to-yellow-500/5', border: 'border-amber-500/20' },
  { id: 'p3', name: 'Transfert+ Lodge', offer: 'Navette hôtel gratuite', icon: <Bus className="w-5 h-5" />, gradient: 'from-cyan-500/10 to-sky-500/5', border: 'border-cyan-500/20' },
  { id: 'p4', name: 'Sénégal Télécom', offer: 'Recharge -15%', icon: <Zap className="w-5 h-5" />, gradient: 'from-emerald-500/10 to-teal-500/5', border: 'border-emerald-500/20' },
];

/* ═══════════════════════════════════════════════════════════
   STATUS BADGE COMPONENT
   ═══════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: DepartureStatus }) {
  const config: Record<DepartureStatus, { label: string; className: string; pulse?: boolean }> = {
    on_time: {
      label: 'À l\'heure',
      className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    boarding: {
      label: 'Embarquement',
      className: 'bg-amber-500/15 text-amber-400 border border-amber-500/40',
      pulse: true,
    },
    delayed: {
      label: 'Retard',
      className: 'bg-red-500/15 text-red-400 border border-red-500/30',
      pulse: true,
    },
    departed: {
      label: 'Parti',
      className: 'bg-slate-500/15 text-slate-500 border border-slate-500/20',
    },
    cancelled: {
      label: 'Annulé',
      className: 'bg-red-500/15 text-red-500 border border-red-500/30',
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider ${c.className} ${c.pulse ? 'animate-pulse' : ''}`}
    >
      {c.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />}
      {c.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   LIVE CLOCK
   ═══════════════════════════════════════════════════════════ */

function LiveClock({ paused }: { paused: boolean }) {
  const [time, setTime] = useState('--:--:--');
  const [dateStr, setDateStr] = useState('');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (paused) return;
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
      setSeconds(now.getSeconds());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div className="flex flex-col items-right text-right">
      <div className="flex items-baseline gap-1">
        <Clock className="w-4 h-4 text-cyan-400" />
        <time
          className="font-mono text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-widest text-white tabular-nums"
          style={{
            textShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
          }}
        >
          {time}
        </time>
      </div>
      <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 tracking-wide">
        {dateStr}
      </span>
      {/* Blinking colon indicator */}
      <div className="flex items-center gap-1 mt-1.5 justify-end">
        <span
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            seconds % 2 === 0
              ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
              : 'bg-emerald-400/30'
          }`}
        />
        <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-widest">Live</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TICKER BAR (Marquee)
   ═══════════════════════════════════════════════════════════ */

function TickerBar({ messages, paused }: { messages: TickerMessage[]; paused: boolean }) {
  const [offset, setOffset] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const currentMsg = messages[currentIndex];

  // Scrolling animation
  useEffect(() => {
    if (paused || !containerRef.current || !textRef.current) return;

    lastTimeRef.current = performance.now();
    const containerWidth = containerRef.current.clientWidth;
    const textWidth = textRef.current.scrollWidth;

    const scroll = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      setOffset((prev) => {
        const next = prev + 60 * delta; // 60px/s
        if (next > textWidth) {
          // Switch message
          setCurrentIndex((i) => (i + 1) % messages.length);
          return -containerWidth;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(scroll);
    };

    setOffset(-containerWidth);
    animRef.current = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animRef.current);
  }, [paused, messages.length, currentIndex]);

  const bgMap: Record<string, string> = {
    info: 'bg-cyan-950/60 border-cyan-500/20',
    alert: 'bg-amber-950/60 border-amber-500/20',
    weather: 'bg-sky-950/60 border-sky-500/20',
    ad: 'bg-emerald-950/60 border-emerald-500/20',
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden w-full border-y ${bgMap[currentMsg.type] || bgMap.info}`}
    >
      <div className="flex items-center h-9 sm:h-10">
        <div className="shrink-0 px-3 flex items-center gap-1.5 h-full bg-white/5 border-r border-white/10">
          <span className="text-sm">{currentMsg.icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hidden sm:inline">
            Info
          </span>
        </div>
        <div className="overflow-hidden flex-1 relative h-full flex items-center">
          <span
            ref={textRef}
            className="whitespace-nowrap px-4 text-sm sm:text-base font-semibold text-slate-200"
            style={{ transform: `translateX(${offset}px)` }}
          >
            {currentMsg.text}
          </span>
        </div>
        <div className="shrink-0 px-3 h-full flex items-center bg-white/5 border-l border-white/10">
          <span className="text-[10px] font-mono text-slate-500 tabular-nums">
            {String(currentIndex + 1).padStart(2, '0')}/{String(messages.length).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEPARTURE ROW
   ═══════════════════════════════════════════════════════════ */

function DepartureRow({ departure, index }: { departure: Departure; index: number }) {
  const isImminent = ['boarding', 'delayed'].includes(departure.status);
  const isDeparted = departure.status === 'departed' || departure.status === 'cancelled';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: isDeparted ? 0.4 : 1, x: 0 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        layout: { duration: 0.4, ease: 'easeInOut' },
      }}
      className={`grid grid-cols-[70px_80px_1fr_60px_120px] sm:grid-cols-[90px_100px_1fr_80px_150px] lg:grid-cols-[120px_120px_1fr_100px_180px] items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 border-b border-white/[0.03] transition-colors duration-300 ${
        isDeparted
          ? 'opacity-40'
          : isImminent
            ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]'
            : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Time */}
      <div className="text-right">
        <span
          className={`font-mono text-lg sm:text-xl lg:text-2xl font-extrabold tracking-wider ${
            isDeparted ? 'text-slate-600 line-through' :
            departure.status === 'delayed' ? 'text-red-400' :
            isImminent ? 'text-amber-300' : 'text-cyan-400'
          }`}
          style={
            !isDeparted && !isImminent
              ? { textShadow: '0 0 12px rgba(6,182,212,0.3)' }
              : undefined
          }
        >
          {departure.time}
        </span>
      </div>

      {/* Line Badge */}
      <div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-extrabold tracking-wider border ${departure.lineBg}`}
        >
          <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${departure.lineGradient}`} />
          <span className={departure.lineColor}>{departure.line}</span>
        </span>
      </div>

      {/* Destination */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {departure.vehicle === 'bus' ? (
          <Bus className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isDeparted ? 'text-slate-700' : 'text-slate-400'}`} />
        ) : (
          <Train className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isDeparted ? 'text-slate-700' : 'text-slate-400'}`} />
        )}
        <span
          className={`text-sm sm:text-base lg:text-lg font-bold truncate ${
            isDeparted ? 'text-slate-600' : 'text-white'
          }`}
        >
          {departure.destination}
        </span>
      </div>

      {/* Platform */}
      <div className="flex justify-center">
        <span
          className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-sm sm:text-base font-extrabold border transition-all duration-300 ${
            isImminent
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10'
              : 'bg-white/[0.03] border-white/10 text-slate-300'
          }`}
        >
          {departure.platform}
        </span>
      </div>

      {/* Status */}
      <div className="flex justify-center">
        <StatusBadge status={departure.status} />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PARTNER ADS STRIP
   ═══════════════════════════════════════════════════════════ */

function PartnerAdsStrip({ paused }: { paused: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PARTNER_ADS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [paused]);

  return (
    <div className="flex items-stretch gap-3 overflow-x-auto px-1">
      {PARTNER_ADS.map((ad, i) => (
        <motion.div
          key={ad.id}
          animate={{
            opacity: i === activeIndex ? 1 : 0.5,
            scale: i === activeIndex ? 1.02 : 0.98,
          }}
          transition={{ duration: 0.4 }}
          className={`flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-gradient-to-r ${ad.gradient} ${ad.border} cursor-default min-w-[200px]`}
        >
          <div className="text-slate-400 shrink-0">{ad.icon}</div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white truncate">{ad.name}</p>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">{ad.offer}</p>
          </div>
          {i === activeIndex && (
            <motion.div
              layoutId="active-ad-indicator"
              className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCANLINE OVERLAY (CRT Effect)
   ═══════════════════════════════════════════════════════════ */

function ScanlineOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 opacity-[0.03]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN KIOSK DEMO COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function KioskDemo() {
  const [departures, setDepartures] = useState<Departure[]>(generateInitialDepartures);
  const [paused, setPaused] = useState(false);
  const [tickerMessages] = useState<TickerMessage[]>(INITIAL_TICKER);
  const departureIdRef = useRef(0);

  // Simulation engine: modify departures every 4-7 seconds
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setDepartures((prev) => {
        const next = [...prev];
        const action = Math.random();

        // 20% chance: a "boarding" becomes "departed"
        if (action < 0.2) {
          const boardingIdx = next.findIndex(
            (d) => d.status === 'boarding'
          );
          if (boardingIdx !== -1) {
            next[boardingIdx] = { ...next[boardingIdx], status: 'departed' as DepartureStatus };
          }
        }
        // 15% chance: an "on_time" becomes "boarding"
        else if (action < 0.35) {
          const onTimeIdx = next.findIndex(
            (d) => d.status === 'on_time'
          );
          if (onTimeIdx !== -1) {
            next[onTimeIdx] = { ...next[onTimeIdx], status: 'boarding' as DepartureStatus };
          }
        }
        // 10% chance: an "on_time" becomes "delayed"
        else if (action < 0.45) {
          const onTimeIdx = next.findIndex(
            (d) => d.status === 'on_time'
          );
          if (onTimeIdx !== -1) {
            const delayMin = Math.floor(Math.random() * 15) + 5;
            const now = new Date();
            now.setMinutes(now.getMinutes() + delayMin);
            const newTime = now.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            next[onTimeIdx] = {
              ...next[onTimeIdx],
              status: 'delayed' as DepartureStatus,
              time: newTime,
              notes: `+${delayMin} min`,
            };
          }
        }
        // 15% chance: remove first "departed" and add new departure at bottom
        else if (action < 0.6) {
          const departedIdx = next.findIndex(
            (d) => d.status === 'departed'
          );
          if (departedIdx !== -1) {
            departureIdRef.current += 1;
            const config = LINE_CONFIGS[Math.floor(Math.random() * LINE_CONFIGS.length)];
            const dest = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
            const offset = Math.floor(Math.random() * 25) + 15;
            next.splice(departedIdx, 1);
            next.push({
              id: `dep-new-${departureIdRef.current}`,
              line: config.line,
              lineColor: config.lineColor,
              lineGradient: config.lineGradient,
              lineBg: config.lineBg,
              destination: dest.name,
              time: getTimePlusMinutes(offset),
              platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
              status: 'on_time' as DepartureStatus,
              vehicle: dest.vehicle,
            });
          }
        }
        // 10% chance: change a platform number
        else if (action < 0.7) {
          const idx = Math.floor(Math.random() * next.length);
          if (next[idx].status !== 'departed') {
            next[idx] = {
              ...next[idx],
              platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
            };
          }
        }

        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [paused]);

  // Count stats
  const onTimeCount = departures.filter((d) => d.status === 'on_time').length;
  const delayedCount = departures.filter((d) => d.status === 'delayed').length;
  const boardingCount = departures.filter((d) => d.status === 'boarding').length;

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: '1100px' }}>
      {/* Outer glow */}
      <div className="absolute -inset-3 bg-gradient-to-br from-cyan-500/15 via-blue-500/5 to-violet-500/15 rounded-2xl blur-2xl" />

      {/* TV Frame */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/50 bg-[#080c14]">
        {/* Screen content — 16:9-ish ratio */}
        <div className="relative aspect-video flex flex-col overflow-hidden">

          {/* Scanline overlay */}
          <ScanlineOverlay />

          {/* ──── HEADER ──── */}
          <div className="shrink-0 flex items-center justify-between px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3.5 bg-gradient-to-r from-cyan-950/40 via-transparent to-violet-950/40 border-b border-white/[0.06] z-20">
            {/* Left: Logo + Station */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Bus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  TERANGAFLOW
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold truncate uppercase tracking-wide">
                    Gare Routière Diamniadio
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Stats */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {onTimeCount} à l&apos;heure
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {boardingCount} embarquement
                </span>
              </div>
              {delayedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-sm shadow-red-400/50" />
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                    {delayedCount} retard
                  </span>
                </div>
              )}
            </div>

            {/* Right: Clock */}
            <LiveClock paused={paused} />
          </div>

          {/* ──── TICKER ──── */}
          <TickerBar messages={tickerMessages} paused={paused} />

          {/* ──── DEPARTURES TABLE ──── */}
          <div className="flex-1 overflow-hidden px-2 sm:px-4 lg:px-8 py-2 sm:py-3">
            {/* Table header */}
            <div className="grid grid-cols-[70px_80px_1fr_60px_120px] sm:grid-cols-[90px_100px_1fr_80px_150px] lg:grid-cols-[120px_120px_1fr_100px_180px] items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border-b border-white/[0.06]">
              <span className="text-right text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                Départ
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                Ligne
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                Destination
              </span>
              <span className="text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                Quai
              </span>
              <span className="text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                Statut
              </span>
            </div>

            {/* Departures list */}
            <div className="overflow-hidden">
              <AnimatePresence mode="popLayout">
                {departures.map((dep, i) => (
                  <DepartureRow key={dep.id} departure={dep} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ──── PARTNER ADS FOOTER ──── */}
          <div className="shrink-0 px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3 bg-gradient-to-t from-white/[0.02] to-transparent border-t border-white/[0.06] z-20">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                Services Partenaires
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
            </div>
            <PartnerAdsStrip paused={paused} />
          </div>
        </div>

        {/* Pause/Play button */}
        <button
          onClick={() => setPaused((p) => !p)}
          className="absolute bottom-2 right-2 z-40 w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all backdrop-blur-sm"
          title={paused ? 'Reprendre la simulation' : 'Pause'}
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        {/* "Powered by" watermark */}
        <div className="absolute bottom-2 left-3 z-40 flex items-center gap-1.5 opacity-30 hover:opacity-60 transition-opacity">
          <Shield className="w-3 h-3 text-cyan-400" />
          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
            Powered by TerangaFlow
          </span>
        </div>
      </div>

      {/* Subtle bottom reflection */}
      <div className="h-8 bg-gradient-to-b from-cyan-500/[0.03] to-transparent rounded-b-2xl blur-xl" />
    </div>
  );
}
