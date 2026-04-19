'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

// Lucide icons
import { Send, Loader2, Bell, CheckCircle, XCircle, Euro } from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface PushCampaignFormProps {
  stationId: string
}

interface SendResult {
  success: boolean
  sent: number
  failed: number
  cost: number
}

interface LineOption {
  id: string
  code: string
  name: string
}

// ============================================================
// Constants
// ============================================================

const RESULT_VARIANTS = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.2, ease: 'easeIn' } },
}

// ============================================================
// Main Component
// ============================================================

export function PushCampaignForm({ stationId }: PushCampaignFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedLines, setSelectedLines] = useState<string[]>([])
  const [result, setResult] = useState<SendResult | null>(null)

  // ── Fetch available lines for the station ────────────────
  // We use a simple fetch so this component stays self-contained
  const [lines, setLines] = useState<LineOption[]>([])
  const [linesLoaded, setLinesLoaded] = useState(false)

  // Load lines on mount
  if (!linesLoaded && stationId) {
    setLinesLoaded(true)
    fetch(`/api/lines?stationId=${stationId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setLines(json.data.map((l: { id: string; code: string; name: string }) => ({
            id: l.id,
            code: l.code,
            name: l.name,
          })))
        }
      })
      .catch(() => {
        // Silently fail — lines selector is optional
      })
  }

  // ── Send mutation ───────────────────────────────────────
  const sendMutation = useMutation<SendResult, Error, void>({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error('Le titre est obligatoire')
      }

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId,
          title: title.trim(),
          body: body.trim() || title.trim(),
          targetLines: selectedLines,
        }),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Échec de l\'envoi')
      return json as SendResult
    },
    onSuccess: (data) => {
      setResult(data)
      if (data.sent > 0) {
        toast.success(`Campagne envoyée : ${data.sent} notification(s)`)
      } else {
        toast.warning('Aucun abonné trouvé pour cette cible')
      }
    },
    onError: (err) => {
      toast.error(`Erreur : ${err.message}`)
      setResult(null)
    },
  })

  // ── Handlers ────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    sendMutation.mutate()
  }

  const handleLineToggle = (lineId: string) => {
    setSelectedLines((prev) =>
      prev.includes(lineId)
        ? prev.filter((id) => id !== lineId)
        : [...prev, lineId]
    )
  }

  const resetForm = () => {
    setTitle('')
    setBody('')
    setSelectedLines([])
    setResult(null)
  }

  const isSubmitting = sendMutation.isPending

  // ── Render ──────────────────────────────────────────────
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/15 flex items-center justify-center">
            <Send className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Nouvelle campagne push</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Envoyez une notification aux abonnés de la gare
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="push-title" className="text-slate-300">
              Titre <span className="text-red-400">*</span>
            </Label>
            <Input
              id="push-title"
              placeholder="Ex : Retard sur la ligne D1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-body" className="text-slate-300">
                Message
              </Label>
              <span className="text-xs text-slate-500 tabular-nums">
                {body.length}/200
              </span>
            </div>
            <Textarea
              id="push-body"
              placeholder="Détails de la notification..."
              value={body}
              onChange={(e) => {
                if (e.target.value.length <= 200) setBody(e.target.value)
              }}
              rows={3}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Target Lines (optional) */}
          {lines.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">
                Lignes cibles <span className="text-slate-500 font-normal">(optionnel)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={`cursor-pointer select-none border-slate-700 transition-colors ${
                    selectedLines.length === 0
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                      : 'text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                  onClick={() => setSelectedLines([])}
                >
                  Toutes les lignes
                </Badge>
                {lines.map((line) => (
                  <Badge
                    key={line.id}
                    variant="outline"
                    className={`cursor-pointer select-none border-slate-700 transition-colors ${
                      selectedLines.includes(line.id)
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                        : 'text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                    onClick={() => handleLineToggle(line.id)}
                  >
                    {line.code}
                  </Badge>
                ))}
              </div>
              {selectedLines.length > 0 && (
                <p className="text-xs text-slate-500">
                  {selectedLines.length} ligne{selectedLines.length > 1 ? 's' : ''} sélectionnée{selectedLines.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Envoyer
                </>
              )}
            </Button>

            {(title || body || selectedLines.length > 0) && (
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400 hover:text-white hover:bg-slate-800"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </form>

        {/* ── Result Display ────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              variants={RESULT_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mt-2"
            >
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 space-y-3">
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  Résultat de la campagne
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Sent */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white tabular-nums leading-none">
                        {result.sent}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Envoyées</p>
                    </div>
                  </div>

                  {/* Failed */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white tabular-nums leading-none">
                        {result.failed}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Échouées</p>
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <Euro className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white tabular-nums leading-none">
                        {result.cost.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">EUR</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
