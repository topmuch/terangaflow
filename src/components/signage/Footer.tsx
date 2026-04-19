'use client';

import { Monitor } from 'lucide-react';

interface FooterProps {
  stationName?: string;
  lastUpdate?: Date;
}

export function Footer({ stationName, lastUpdate }: FooterProps) {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-center py-3 px-4 flex items-center justify-between text-slate-500 text-sm shrink-0">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-blue-400" />
        <span className="font-semibold">SmartTicketQR</span>
        <span className="hidden sm:inline">© {new Date().getFullYear()}</span>
      </div>
      {stationName && (
        <span className="hidden sm:inline text-xs">Affichage dynamique — {stationName}</span>
      )}
      {lastUpdate && (
        <span className="text-xs tabular-nums">
          MàJ {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </footer>
  );
}
