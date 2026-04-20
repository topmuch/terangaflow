'use client'

import { use, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Bell, BellOff, Loader2, MapPin, Shield, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePushSubscription } from '@/hooks/usePushSubscription'

// ============================================================
// Types
// ============================================================

interface Station {
  id: string
  name: string
  code: string
  city: string
  country: string
}

// ============================================================
// Animation variants
// ============================================================

const containerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.1 } },
}

const stepVariants = {
  initial: { opacity: 0, x: -12 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.1, duration: 0.3 },
  }),
}

// ============================================================
// Page Component
// ============================================================

export default function SubscribePage({
  params,
}: {
  params: Promise<{ stationId: string }>
}) {
  const { stationId } = use(params)
  const [station, setStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushSubscription({
    stationId,
    onSubscribed: () => {},
    onUnsubscribed: () => {},
  })

  // Fetch station info
  useEffect(() => {
    async function fetchStation() {
      try {
        const res = await fetch(`/api/stations?stationId=${stationId}`)
        const json = await res.json()
        if (json.success && json.data) {
          // Handle both array and single object
          const stations = Array.isArray(json.data) ? json.data : [json.data]
          const match = stations.find(
            (s: { id: string }) => s.id === stationId
          ) || stations[0]
          setStation(match)
        }
      } catch {
        // Station not found, continue anyway
      } finally {
        setLoading(false)
      }
    }
    fetchStation()
  }, [stationId])

  const handleSubscribe = async () => {
    await subscribe()
  }

  const handleUnsubscribe = async () => {
    await unsubscribe()
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm text-zinc-500">Chargement...</p>
        </div>
      </div>
    )
  }

  // ── Not supported state ──
  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="max-w-md w-full"
        >
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto">
                <BellOff className="w-6 h-6 text-zinc-500" />
              </div>
              <h1 className="text-lg font-semibold text-white">
                Notifications non supportees
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Votre navigateur ne supporte pas les notifications push.
                Veuillez utiliser un navigateur moderne comme Chrome, Firefox ou Edge.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── Main content ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="max-w-md w-full space-y-6"
      >
        {/* Station Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto">
            <Bell className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Alertes {station?.name ?? 'Gare'}
            </h1>
            {station && (
              <p className="text-sm text-zinc-500 flex items-center justify-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {station.city}, {station.country}
                <Badge variant="outline" className="ml-2 text-xs font-mono border-zinc-700 text-zinc-400">
                  {station.code}
                </Badge>
              </p>
            )}
          </div>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Recevez des notifications en temps reel pour les retards, annulations
            et informations importantes de votre gare.
          </p>
        </div>

        {/* Subscription Card */}
        <motion.div variants={cardVariants} initial="initial" animate="animate">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-6 space-y-5">
              {/* Current status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSubscribed ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                  )}
                  <span className="text-sm text-zinc-300">
                    {isSubscribed ? 'Abonne' : 'Non abonne'}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    isSubscribed
                      ? 'border-emerald-500/40 text-emerald-400'
                      : 'border-zinc-700 text-zinc-500'
                  }`}
                >
                  {permission === 'granted' ? 'Autorise' : permission === 'denied' ? 'Refuse' : 'En attente'}
                </Badge>
              </div>

              {/* What you get */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Vous recevrez
                </p>
                {[
                  'Alertes de retard en temps reel',
                  'Notifications d\'annulation',
                  'Informations sur les changements de quai',
                  'Messages speciaux de la gare',
                ].map((text, i) => (
                  <motion.div
                    key={text}
                    custom={i}
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    className="flex items-center gap-2.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-zinc-300">{text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Action button */}
              {isSubscribed ? (
                <Button
                  variant="outline"
                  className="w-full gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  onClick={handleUnsubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                  Se desabonner
                </Button>
              ) : (
                <Button
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  S&apos;abonner aux notifications
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex items-start gap-2 justify-center text-xs text-zinc-600"
        >
          <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            Vos donnees sont protegees conformement au RGPD. Vous pouvez vous
            desabonner a tout moment. Aucune donnee personnelle n&apos;est collectee
            au-dela de la souscription aux notifications.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
