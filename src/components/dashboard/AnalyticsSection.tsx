'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, MonitorUp, TrendingUp, BarChart3, Info } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================
// Types
// ============================================================

interface AnalyticsCounts {
  impressions: number;
  screenOns: number;
  qrScans: number;
  clicks: number;
}

interface AnalyticsSectionProps {
  stationId: string;
}

// ============================================================
// Component
// ============================================================

export function AnalyticsSection({ stationId }: AnalyticsSectionProps) {
  const { data: analytics, isLoading } = useQuery<AnalyticsCounts>({
    queryKey: ['analytics-screen', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/screen-stats?stationId=${stationId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 30000,
  });

  const impressions = analytics?.impressions ?? 0;
  const screenOns = analytics?.screenOns ?? 0;
  const qrScans = analytics?.qrScans ?? 0;
  const clicks = analytics?.clicks ?? 0;
  const hourlyViews = impressions > 0 ? Math.round(impressions / 24) : 0;

  const stats = [
    {
      title: 'Impressions Ecran (24h)',
      value: impressions,
      subtitle: `~${hourlyViews} vues/heure`,
      icon: Eye,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
    },
    {
      title: 'Sessions Ecran',
      value: screenOns,
      subtitle: 'Allumages ecran',
      icon: MonitorUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Scans QR (24h)',
      value: qrScans,
      subtitle: 'Partenaires visites',
      icon: BarChart3,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'Interactions',
      value: clicks,
      subtitle: 'Clics et actions',
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
          <BarChart3 className="w-4.5 h-4.5 text-sky-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Analytics (24h)</h3>
          <p className="text-xs text-slate-400">Donnees de frequentation et de performance</p>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
            >
              <Card className={`border ${stat.borderColor} bg-slate-900 overflow-hidden`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400 font-medium">{stat.title}</p>
                      <p className={`text-3xl font-bold tabular-nums ${stat.color}`}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-slate-500">{stat.subtitle}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pro Tip */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-300 font-medium">
                <strong>Astuce Pro :</strong> Utilisez ces chiffres pour vendre vos espaces publicitaires.
              </p>
              <p className="text-xs text-emerald-400/70 mt-1">
                &quot;Mon ecran genere {hourlyViews} vues par heure garanties.&quot;
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
