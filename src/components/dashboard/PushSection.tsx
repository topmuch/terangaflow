'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Lucide icons
import { Bell, Mail, Clock, Euro, Users } from 'lucide-react'

// Components
import { PushCampaignForm } from './PushCampaignForm'

// ============================================================
// Types
// ============================================================

interface PushSectionProps {
  stationId: string
}

interface PushCampaign {
  id: string
  stationId: string
  title: string
  body: string
  targetLines: string
  status: string
  sentCount: number
  failedCount: number
  costEUR: number
  createdAt: string
}

// ============================================================
// Constants
// ============================================================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SENT: { label: 'Envoyée', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  PARTIAL: { label: 'Partielle', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  FAILED: { label: 'Échouée', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const ROW_VARIANTS = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: 8, transition: { duration: 0.15, ease: 'easeIn' } },
}

// ============================================================
// Helpers
// ============================================================

function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '…'
}

// ============================================================
// Main Component
// ============================================================

export function PushSection({ stationId }: PushSectionProps) {
  // ── Fetch campaigns ────────────────────────────────────
  const { data: campaigns, isLoading } = useQuery<PushCampaign[]>({
    queryKey: ['push-campaigns', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/push/campaigns?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 30000,
  })

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="w-full space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
          <Bell className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Notifications Push</h3>
          <p className="text-xs text-slate-400">
            Gérez les alertes push envoyées aux abonnés de la gare
          </p>
        </div>
      </div>

      {/* ── Campaign Form ──────────────────────────────── */}
      <PushCampaignForm stationId={stationId} />

      {/* ── Recent Campaigns Table ─────────────────────── */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <CardTitle className="text-sm text-white">Campagnes récentes</CardTitle>
            </div>
            {campaigns && campaigns.length > 0 && (
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                {campaigns.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-800/50" />
              ))}
            </div>
          ) : !campaigns || campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-400">Aucune campagne</p>
              <p className="text-xs text-slate-500 mt-1">
                Envoyez votre première notification push
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-medium">Titre</TableHead>
                    <TableHead className="text-xs text-slate-400 font-medium hidden sm:table-cell">Message</TableHead>
                    <TableHead className="text-xs text-slate-400 font-medium text-center">
                      <span className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" />
                        Envoyées
                      </span>
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-medium text-center hidden md:table-cell">
                      <span className="flex items-center justify-center gap-1">
                        <Euro className="w-3 h-3" />
                        Coût
                      </span>
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-medium">Statut</TableHead>
                    <TableHead className="text-xs text-slate-400 font-medium text-right hidden lg:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {campaigns.map((campaign) => {
                      const statusConf = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.SENT

                      return (
                        <motion.tr
                          key={campaign.id}
                          variants={ROW_VARIANTS}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="border-b border-slate-800/60 transition-colors hover:bg-slate-800/40"
                        >
                          <TableCell className="py-3">
                            <p className="text-sm font-medium text-white">
                              {truncate(campaign.title, 30)}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 hidden sm:table-cell">
                            <p className="text-sm text-slate-400">
                              {truncate(campaign.body, 40)}
                            </p>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className="text-sm font-medium text-white tabular-nums">
                              {campaign.sentCount}
                            </span>
                            {campaign.failedCount > 0 && (
                              <span className="text-xs text-red-400 ml-1">
                                ({campaign.failedCount})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-center hidden md:table-cell">
                            <span className="text-sm text-slate-300 tabular-nums">
                              {campaign.costEUR.toFixed(2)} €
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusConf.className}`}
                            >
                              {statusConf.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-right hidden lg:table-cell">
                            <span className="text-xs text-slate-500">
                              {formatDateTime(campaign.createdAt)}
                            </span>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
