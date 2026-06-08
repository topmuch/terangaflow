"use client";

import { Bus, ShieldCheck } from "lucide-react";
import type { KioskModeState } from "@/hooks/useKioskMode";

interface SignageFooterProps {
  lastUpdated: Date | null;
  kiosk: KioskModeState;
  wakeLockActive: boolean;
}

export function SignageFooter({
  lastUpdated,
  kiosk,
  wakeLockActive,
}: SignageFooterProps) {
  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "—";

  return (
    <footer className="flex items-center justify-between px-6 py-2 bg-gray-100 dark:bg-gray-800 border-t text-xs text-muted-foreground">
      {/* Left: Powered by */}
      <div className="flex items-center gap-2">
        <Bus className="h-3.5 w-3.5 text-amber-500" />
        <span>
          Propulsé par <span className="font-semibold text-foreground">TerangaFlow</span>
        </span>
      </div>

      {/* Center: Status indicators */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span
            className={`h-2 w-2 rounded-full ${wakeLockActive ? "bg-emerald-500" : "bg-gray-400"}`}
          />
          <span className="hidden sm:inline">
            {wakeLockActive ? "Écran actif" : "Wake lock off"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Données chiffrées</span>
        </div>

        <span className="text-muted-foreground hidden md:inline">
          Dernière MAJ :{" "}
          <span className="font-mono font-medium">{formattedTime}</span>
        </span>
      </div>

      {/* Right: Kiosk mode indicator */}
      <button
        onClick={kiosk.isKiosk ? kiosk.exitKiosk : kiosk.enterKiosk}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label={
          kiosk.isKiosk ? "Quitter le mode kiosque" : "Activer le mode kiosque"
        }
      >
        <span
          className={`h-2 w-2 rounded-full ${kiosk.isKiosk ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}
        />
        <span>{kiosk.isKiosk ? "Kiosque ON" : "Mode kiosque"}</span>
      </button>
    </footer>
  );
}
