'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// shadcn/ui
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// Lucide icons
import { Plus, Pencil, Trash2, Megaphone, Info, AlertOctagon, AlertTriangle, Loader2 } from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface TickerManagerProps {
  stationId: string
}

interface TickerMessage {
  id: string
  stationId: string
  content: string
  priority: number
  type: string
  startDate: string | null
  endDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface TickerForm {
  content: string
  type: string
  priority: string
  startDate: string
  endDate: string
  isActive: boolean
}

// ============================================================
// Constants
// ============================================================

const EMPTY_FORM: TickerForm = {
  content: '',
  type: 'INFO',
  priority: '0',
  startDate: '',
  endDate: '',
  isActive: true,
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bgClass: string; textClass: string; icon: React.ElementType }> = {
  INFO: {
    label: 'Info',
    color: 'sky-500',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-400',
    icon: Info,
  },
  ALERT: {
    label: 'Alerte',
    color: 'amber-500',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    icon: AlertOctagon,
  },
  AD: {
    label: 'Pub',
    color: 'purple-500',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    icon: Megaphone,
  },
  URGENT: {
    label: 'Urgent',
    color: 'red-500',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    icon: AlertTriangle,
  },
}

const CARD_VARIANTS = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.2, ease: 'easeIn' } },
}

// ============================================================
// Helpers
// ============================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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

export function TickerManager({ stationId }: TickerManagerProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMsg, setEditingMsg] = useState<TickerMessage | null>(null)
  const [form, setForm] = useState<TickerForm>(EMPTY_FORM)

  // ── Fetch ticker messages ──────────────────────────────
  const { data: messages, isLoading } = useQuery<TickerMessage[]>({
    queryKey: ['ticker-messages', stationId],
    queryFn: async () => {
      const res = await fetch(`/api/ticker-messages?stationId=${stationId}`)
      if (!res.ok) throw new Error('Failed to fetch ticker messages')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    refetchInterval: 15000,
  })

  // ── Create mutation ────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: TickerForm) => {
      const res = await fetch('/api/ticker-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId,
          content: data.content,
          type: data.type,
          priority: parseInt(data.priority) || 0,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticker-messages'] })
      toast.success('Message créé avec succès')
      setDialogOpen(false)
      resetForm()
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  })

  // ── Update mutation ────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TickerMessage> }) => {
      const res = await fetch('/api/ticker-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticker-messages'] })
      if (variables.data.content !== undefined || variables.data.type !== undefined) {
        toast.success('Message mis à jour')
        setDialogOpen(false)
        resetForm()
        setEditingMsg(null)
      } else {
        toast.success('Statut modifié')
      }
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  })

  // ── Delete mutation ────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ticker-messages?id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticker-messages'] })
      toast.success('Message supprimé')
    },
    onError: (err) => toast.error(`Erreur : ${err.message}`),
  })

  // ── Handlers ───────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingMsg(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (msg: TickerMessage) => {
    setEditingMsg(msg)
    setForm({
      content: msg.content,
      type: msg.type,
      priority: String(msg.priority),
      startDate: msg.startDate ? msg.startDate.slice(0, 10) : '',
      endDate: msg.endDate ? msg.endDate.slice(0, 10) : '',
      isActive: msg.isActive,
    })
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.content.trim()) {
      toast.error('Le contenu est obligatoire')
      return
    }
    if (form.content.length > 200) {
      toast.error('Le contenu ne doit pas dépasser 200 caractères')
      return
    }

    if (editingMsg) {
      updateMutation.mutate({
        id: editingMsg.id,
        data: {
          content: form.content,
          type: form.type,
          priority: parseInt(form.priority) || 0,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          isActive: form.isActive,
        },
      })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleToggleActive = (msg: TickerMessage) => {
    updateMutation.mutate({
      id: msg.id,
      data: { isActive: !msg.isActive },
    })
  }

  const updateForm = <K extends keyof TickerForm>(key: K, value: TickerForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ── Render ─────────────────────────────────────────────
  const messageCount = messages?.length ?? 0

  return (
    <div className="w-full space-y-4">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <Megaphone className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Messages du bandeau</h3>
            <p className="text-xs text-slate-400">
              {messageCount} message{messageCount !== 1 ? 's' : ''} configuré{messageCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4" />
              Nouveau message
            </Button>
          </DialogTrigger>

          {/* ── Create / Edit Dialog ─────────────────────── */}
          <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingMsg ? 'Modifier le message' : 'Nouveau message'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingMsg
                  ? 'Modifiez le contenu et les paramètres du bandeau.'
                  : 'Ajoutez un nouveau message au bandeau défilant.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ticker-content" className="text-slate-300">
                    Contenu <span className="text-red-400">*</span>
                  </Label>
                  <span className={cn(
                    'text-xs tabular-nums',
                    form.content.length > 200 ? 'text-red-400' : 'text-slate-500',
                  )}>
                    {form.content.length}/200
                  </span>
                </div>
                <Textarea
                  id="ticker-content"
                  placeholder="Ex : Retard sur la ligne D1 en raison de travaux..."
                  value={form.content}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) updateForm('content', e.target.value)
                  }}
                  rows={3}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                />
              </div>

              {/* Type + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticker-type" className="text-slate-300">Type</Label>
                  <Select value={form.type} onValueChange={(v) => updateForm('type', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="INFO">
                        <span className="flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-sky-400" />
                          Info
                        </span>
                      </SelectItem>
                      <SelectItem value="ALERT">
                        <span className="flex items-center gap-2">
                          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                          Alerte
                        </span>
                      </SelectItem>
                      <SelectItem value="AD">
                        <span className="flex items-center gap-2">
                          <Megaphone className="w-3.5 h-3.5 text-purple-400" />
                          Publicité
                        </span>
                      </SelectItem>
                      <SelectItem value="URGENT">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          Urgent
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticker-priority" className="text-slate-300">
                    Priorité <span className="text-slate-500 font-normal">(0–10)</span>
                  </Label>
                  <Input
                    id="ticker-priority"
                    type="number"
                    min={0}
                    max={10}
                    value={form.priority}
                    onChange={(e) => updateForm('priority', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticker-start" className="text-slate-300">Date de début</Label>
                  <Input
                    id="ticker-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateForm('startDate', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticker-end" className="text-slate-300">Date de fin</Label>
                  <Input
                    id="ticker-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateForm('endDate', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
                <div className="space-y-0.5">
                  <Label className="text-sm text-slate-300">Message actif</Label>
                  <p className="text-xs text-slate-500">Le message sera affiché sur le bandeau</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => updateForm('isActive', checked)}
                />
              </div>

              {/* Footer */}
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    resetForm()
                  }}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingMsg ? 'Mise à jour...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {editingMsg ? 'Enregistrer' : 'Créer'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Message List ────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : !messages?.length ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <Megaphone className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Aucun message configuré</p>
            <p className="text-xs text-slate-500 mt-1">
              Créez votre premier message pour le bandeau défilant
            </p>
            <Button
              size="sm"
              className="mt-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4" />
              Nouveau message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => {
              const typeConf = TYPE_CONFIG[msg.type] || TYPE_CONFIG.INFO
              const TypeIcon = typeConf.icon

              return (
                <motion.div
                  key={msg.id}
                  variants={CARD_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                >
                  <Card
                    className={cn(
                      'border-slate-800 bg-slate-900 overflow-hidden transition-colors',
                      !msg.isActive && 'opacity-60',
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Left: Type indicator + Content */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                          {/* Top row: badge + priority + active */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold',
                                typeConf.bgClass,
                                typeConf.textClass,
                              )}
                            >
                              <TypeIcon className="w-3 h-3" />
                              {typeConf.label}
                            </span>

                            <Badge
                              variant="outline"
                              className="text-xs font-mono border-slate-700 text-slate-400"
                            >
                              Prio {msg.priority}
                            </Badge>

                            {!msg.isActive && (
                              <Badge
                                variant="outline"
                                className="text-xs border-slate-700 text-slate-500"
                              >
                                Inactif
                              </Badge>
                            )}
                          </div>

                          {/* Content */}
                          <p className={cn(
                            'text-sm leading-relaxed',
                            msg.isActive ? 'text-slate-200' : 'text-slate-500',
                          )}>
                            {msg.content}
                          </p>

                          {/* Date range */}
                          {(msg.startDate || msg.endDate) && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Info className="w-3 h-3" />
                              {msg.startDate && (
                                <span>du {formatDate(msg.startDate)}</span>
                              )}
                              {msg.startDate && msg.endDate && (
                                <span>au {formatDate(msg.endDate)}</span>
                              )}
                              {!msg.startDate && msg.endDate && (
                                <span>jusqu&apos;au {formatDate(msg.endDate)}</span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1 sm:flex-col sm:items-end shrink-0">
                          {/* Active toggle */}
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`toggle-${msg.id}`}
                              className="text-xs text-slate-500 hidden sm:inline"
                            >
                              Actif
                            </Label>
                            <Switch
                              id={`toggle-${msg.id}`}
                              checked={msg.isActive}
                              onCheckedChange={() => handleToggleActive(msg)}
                              disabled={updateMutation.isPending}
                            />
                          </div>

                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-sky-400 hover:bg-slate-800"
                              onClick={() => openEdit(msg)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-slate-800">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">
                                    Supprimer ce message ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    Cette action supprimera le message : &quot;{truncate(msg.content, 60)}&quot;.
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                    Annuler
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => deleteMutation.mutate(msg.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    {deleteMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : null}
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
