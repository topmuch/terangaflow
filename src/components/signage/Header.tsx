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
  /** Custom brand name — overrides "TerangaFlow" when provided */
  brandName?: string;
  /** Custom brand logo URL — overrides the default Bus icon when provided */
  brandLogoUrl?: string;
}

export function SignageHeader({
  clock,
  stationName,
  stationCode,
  kiosk,
  isOnline,
  brandName,
  brandLogoUrl,
}: SignageHeaderProps) {
  // Use CSS variable --brand-primary with amber-500 fallback
  const brandColor = "var(--brand-primary, #f59e0b)";
  // Computed shadow using same color with transparency
  const brandShadow = "var(--brand-primary, #f59e0b)";

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Left: Brand + station */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          {/* Brand icon / logo */}
          {brandLogoUrl ? (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shadow-lg overflow-hidden"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 4px 14px -3px color-mix(in srgb, ${brandShadow} 40%, transparent)`,
              }}
            >
              <img
                src={brandLogoUrl}
                alt={brandName ?? "TerangaFlow"}
                className="h-6 w-6 object-contain"
              />
            </div>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shadow-lg"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 4px 14px -3px color-mix(in srgb, ${brandShadow} 40%, transparent)`,
              }}
            >
              <Bus className="h-6 w-6" />
            </div>
          )}

          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              {brandName ?? "TerangaFlow"}
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
