'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'emerald' | 'sky' | 'rose';
  subtitle?: string;
  trend?: { value: number; label: string };
  index?: number;
}

const colorMap = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-500', ring: 'ring-blue-500/20' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', icon: 'text-green-500', ring: 'ring-green-500/20' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'text-red-500', ring: 'ring-red-500/20' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-500', ring: 'ring-amber-500/20' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-500', ring: 'ring-purple-500/20' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: 'text-sky-500', ring: 'ring-sky-500/20' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: 'text-rose-500', ring: 'ring-rose-500/20' },
};

export function StatCard({ title, value, icon: Icon, color, subtitle, trend, index = 0 }: StatCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`relative overflow-hidden p-5 rounded-xl border ${c.bg} ${c.border} bg-slate-900/80 backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white mt-1 tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-xs font-bold ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-[10px] text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ring-1 ${c.ring} bg-slate-800/50 shrink-0`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </motion.div>
  );
}
