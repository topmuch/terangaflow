"use client";

import { motion } from "framer-motion";
import { Bus, Wifi, WifiOff, Maximize, Minimize } from "lucide-react";
import type { RealTimeClock } from "@/hooks/useRealTimeClock";
import type { KioskModeState } from "@/hooks/useKioskMode";

interface SignageHeaderProps {
  clock: RealTimeClock;
  stationName: string;
  stationCode: string;
  kiosk: KioskModeState;
  isOnline: boolean;
}

export function SignageHeader({
  clock,
  stationName,
  stationCode,
  kiosk,
  isOnline,
}: SignageHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Left: Brand + station */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 shadow-lg shadow-amber-500/25">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              TerangaFlow
            </h1>
            <p className="text-[11px] text-gray-400 leading-none mt-0.5">
              L&apos;intelligence des gares
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-600" aria-hidden="true" />

        <div>
          <p className="text-sm font-semibold leading-none">{stationName}</p>
          <p className="text-[11px] text-gray-400 font-mono leading-none mt-0.5">
            {stationCode}
          </p>
        </div>
      </div>

      {/* Center: Date */}
      <motion.p
        key={clock.date}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        className="text-sm text-gray-300 font-medium hidden sm:block"
      >
        {clock.date}
      </motion.p>

      {/* Right: Clock + status + kiosk toggle */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
        </div>

        {/* Clock */}
        <motion.time
          key={clock.time}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-mono font-bold tabular-nums tracking-wider"
          dateTime={clock.isoString}
        >
          {clock.time}
        </motion.time>

        {/* Fullscreen toggle */}
        <button
          onClick={kiosk.toggleFullscreen}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 transition-colors"
          aria-label={kiosk.isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {kiosk.isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
