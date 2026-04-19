'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Megaphone, AlertCircle } from 'lucide-react';

interface TickerMessage {
  id: string;
  content: string;
  type: 'INFO' | 'ALERT' | 'AD' | 'URGENT';
}

interface TickerProps {
  stationId: string;
  refreshMs?: number;
}

const TYPE_ICONS: Record<string, typeof Info> = {
  INFO: Info,
  ALERT: AlertTriangle,
  AD: Megaphone,
  URGENT: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-blue-500/20 text-blue-300',
  ALERT: 'bg-amber-500/20 text-amber-300',
  AD: 'bg-purple-500/20 text-purple-300',
  URGENT: 'bg-red-500/20 text-red-300',
};

export function Ticker({ stationId, refreshMs = 60000 }: TickerProps) {
  const [messages, setMessages] = useState<TickerMessage[]>([]);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/ticker?stationId=${stationId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setMessages(json.data || []);
        }
      } catch { /* ignored */ }
    }
    fetchMessages();
    const interval = setInterval(fetchMessages, refreshMs);
    return () => clearInterval(interval);
  }, [stationId, refreshMs]);

  if (messages.length === 0) {
    return (
      <div className="bg-slate-900/80 border-y border-slate-700/50 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-slate-500">
          <Info className="w-4 h-4" />
          <span>Aucun message en cours</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border-y border-slate-700/50 overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-2">
        <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-bold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Live
        </div>
        <div className="flex-1 overflow-hidden relative h-6">
          <motion.div
            className="absolute whitespace-nowrap flex items-center gap-8"
            animate={{ x: ['0%', '-100%'] }}
            transition={{ duration: messages.length * 8, repeat: Infinity, ease: 'linear' }}
          >
            {messages.map((msg, i) => {
              const Icon = TYPE_ICONS[msg.type] || Info;
              return (
                <span key={msg.id} className="inline-flex items-center gap-2 text-sm text-slate-200">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[msg.type]}`}>
                    <Icon className="w-3 h-3" />
                    {msg.type}
                  </span>
                  {msg.content}
                  {i < messages.length - 1 && <span className="text-slate-600 mx-2">•</span>}
                </span>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
