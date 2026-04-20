'use client';

import { useRealTimeClock } from '@/hooks/useRealTimeClock';
import { Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  stationName: string;
  city: string;
  timezone?: string;
}

export function Header({ stationName, city, timezone = 'Africa/Dakar' }: HeaderProps) {
  const { timeString, dateString, isOnline } = useRealTimeClock(timezone);

  return (
    <header className="bg-slate-900 text-white px-4 md:px-6 py-3 md:py-4 border-b-4 border-blue-500 flex items-center justify-between">
      <div className="flex items-center gap-3 shrink-0">
        <div className="bg-blue-600 px-2.5 py-1 rounded font-black text-base md:text-xl tracking-tight">STQR</div>
        <div className="hidden lg:block">
          <p className="text-xs text-blue-300 font-medium">Powered by</p>
          <p className="text-sm text-blue-200 font-semibold">SmartTicketQR</p>
        </div>
      </div>
      <div className="text-center flex-1 px-2 md:px-4 min-w-0">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight truncate">{stationName}</h1>
        <p className="text-blue-200 font-medium text-sm md:text-base">{city}</p>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-2">
          <span className="text-3xl md:text-4xl font-mono font-bold tracking-wider text-green-400">{timeString}</span>
          {isOnline ? <Wifi className="w-4 h-4 md:w-5 md:h-5 text-green-400" /> : <WifiOff className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />}
        </div>
        <p className="text-slate-300 text-xs md:text-sm capitalize">{dateString}</p>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold mt-1 ${isOnline ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
          <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
          {isOnline ? 'EN DIRECT' : 'HORS-LIGNE'}
        </span>
      </div>
    </header>
  );
}
