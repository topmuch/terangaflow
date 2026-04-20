'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, ShieldAlert, Trash2, FileText, Database, Clock, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface DataCategory {
  label: string
  count: number
  icon: React.ReactNode
}

interface PrivacyPanelProps {
  userId: string
}

export function DataPrivacyPanel({ userId }: PrivacyPanelProps) {
  const [categories, setCategories] = useState<DataCategory[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [isAnonymizing, setIsAnonymizing] = useState(false)
  const [lastExportDate, setLastExportDate] = useState<string | null>(null)
  const [showExportPreview, setShowExportPreview] = useState(false)
  const [exportPreviewData, setExportPreviewData] = useState<Record<string, unknown> | null>(null)

  // Load last export date from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`rgpd-last-export-${userId}`)
      if (stored) setLastExportDate(stored)
    } catch {
      // ignore
    }
  }, [userId])

  // Fetch data category counts
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/rgpd/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        throw new Error('Échec du chargement des catégories')
      }

      const json = await res.json()

      if (json.success) {
        const data = json.data as Record<string, unknown>
        const hist = data.historiqueActivite as Record<string, unknown> | undefined
        const keys = data.clesApi as Record<string, unknown> | undefined
        const usage = data.utilisationApi as Record<string, unknown> | undefined
        const tenant = data.donneesTenant as Record<string, unknown> | null

        setCategories([
          {
            label: 'Journal d\'activité',
            count: (hist?.totalEntrees as number) ?? 0,
            icon: <Clock className="h-4 w-4" />,
          },
          {
            label: 'Clés API',
            count: (keys?.totalCles as number) ?? 0,
            icon: <FileText className="h-4 w-4" />,
          },
          {
            label: 'Requêtes API',
            count: (usage?.totalRequetes as number) ?? 0,
            icon: <Database className="h-4 w-4" />,
          },
          {
            label: 'Données tenant',
            count: tenant ? 1 : 0,
            icon: <ShieldAlert className="h-4 w-4" />,
          },
        ])
      }
    } catch {
      // Silently fail — categories will remain empty
    }
  }, [userId])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Export data
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/rgpd/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        throw new Error('Échec de l\'export')
      }

      const json = await res.json()

      if (json.success) {
        // Show preview dialog
        setExportPreviewData(json.data)
        setShowExportPreview(true)

        // Download as JSON file
        const blob = new Blob([JSON.stringify(json.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `smartticketqr-export-${userId}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // Save last export date
        const now = new Date().toISOString()
        localStorage.setItem(`rgpd-last-export-${userId}`, now)
        setLastExportDate(now)

        toast.success('Export réussi', {
          description: 'Vos données personnelles ont été téléchargées.',
        })
      } else {
        throw new Error(json.error || 'Erreur inconnue')
      }
    } catch {
      toast.error('Échec de l\'export', {
        description: 'Impossible d\'exporter vos données. Veuillez réessayer.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Anonymize data
  const handleAnonymize = async () => {
    setIsAnonymizing(true)
    try {
      const res = await fetch('/api/rgpd/anonymize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!res.ok) {
        throw new Error('Échec de l\'anonymisation')
      }

      const json = await res.json()

      if (json.success) {
        toast.success('Anonymisation terminée', {
          description: 'Vos données personnelles ont été anonymisées avec succès.',
        })
        // Refresh categories after anonymization
        await fetchCategories()
      } else {
        throw new Error(json.error || 'Erreur inconnue')
      }
    } catch {
      toast.error('Échec de l\'anonymisation', {
        description: 'Impossible d\'anonymiser vos données. Veuillez réessayer.',
      })
    } finally {
      setIsAnonymizing(false)
    }
  }

  const formatLastExport = (isoString: string | null) => {
    if (!isoString) return null
    const date = new Date(isoString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Protection des données (RGPD)</CardTitle>
              <CardDescription>
                Gérez vos données personnelles conformément au Règlement Général sur la Protection des Données.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Data categories */}
          <div>
            <p className="text-sm font-medium mb-3">Catégories de données stockées</p>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.label}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{cat.label}</p>
                    <Badge variant="secondary" className="mt-0.5 text-xs">
                      {cat.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Last export date */}
          {lastExportDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Dernier export : {formatLastExport(lastExportDate)}</span>
            </div>
          )}

          <Separator />

          {/* Action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? 'Export en cours...' : 'Exporter mes données'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="gap-2"
                  disabled={isAnonymizing}
                >
                  {isAnonymizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isAnonymizing ? 'Anonymisation...' : 'Anonymiser mes données'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    Confirmer l&apos;anonymisation
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm">
                      <p>
                        Cette action est <strong>irréversible</strong>. Vos données personnelles
                        seront définitivement anonymisées :
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Votre adresse email sera remplacée par une version hachée</li>
                        <li>Votre nom sera remplacé par &quot;Utilisateur anonymisé&quot;</li>
                        <li>Votre photo de profil sera supprimée</li>
                        <li>Vos clés API seront révoquées</li>
                        <li>Les adresses IP dans l&apos;historique seront supprimées</li>
                      </ul>
                      <p className="font-medium text-destructive">
                        Votre compte restera actif, mais toutes vos données personnelles seront perdues.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleAnonymize}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Oui, anonymiser mes données
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Export preview dialog */}
      <Dialog open={showExportPreview} onOpenChange={setShowExportPreview}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              Aperçu de l&apos;export
            </DialogTitle>
            <DialogDescription>
              Voici les données qui ont été exportées. Le fichier JSON complet a été téléchargé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {exportPreviewData && (
              <pre className="max-h-60 overflow-auto rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(exportPreviewData).map(([key, value]) => {
                      if (typeof value === 'object' && value !== null && 'totalEntrees' in value) {
                        return [key, { ...value, donnees: `[${value.donnees as unknown[]} — voir fichier]` }]
                      }
                      if (typeof value === 'object' && value !== null && 'totalCles' in value) {
                        return [key, { ...value, donnees: `[${value.donnees as unknown[]} — voir fichier]` }]
                      }
                      return [key, value]
                    })
                  ),
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
