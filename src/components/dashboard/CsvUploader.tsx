'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { parseCSV, downloadCSV, generateScheduleTemplate } from '@/lib/csvParser'
import type { CsvParseResult } from '@/lib/csvParser'

interface CsvUploaderProps {
  stationId: string
}

type UploadState = 'idle' | 'dragging' | 'preview' | 'uploading' | 'success' | 'error'

export function CsvUploader({ stationId }: CsvUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [csvText, setCsvText] = useState<string>('')
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [resultMessage, setResultMessage] = useState<{
    imported: number
    failed: number
    error?: string
  } | null>(null)

  const reset = useCallback(() => {
    setState('idle')
    setCsvText('')
    setParseResult(null)
    setFileName('')
    setResultMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState('dragging')
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState('idle')
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setState('error')
      setResultMessage({ imported: 0, failed: 0, error: 'Veuillez sélectionner un fichier CSV (.csv).' })
      return
    }

    setFileName(file.name)
    setResultMessage(null)

    file.text().then((text) => {
      const parsed = parseCSV(text)
      setCsvText(text)
      setParseResult(parsed)
      setState('preview')
    }).catch(() => {
      setState('error')
      setResultMessage({ imported: 0, failed: 0, error: 'Impossible de lire le fichier. Veuillez réessayer.' })
    })
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setState('idle')

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleDownloadTemplate = useCallback(() => {
    const template = generateScheduleTemplate()
    downloadCSV('modele_horaires.csv', template)
  }, [])

  const handleConfirmImport = useCallback(async () => {
    if (!csvText) return

    setState('uploading')
    setResultMessage(null)

    try {
      const response = await fetch('/api/schedules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId, csv: csvText }),
      })

      const data = await response.json()

      if (!response.ok) {
        setState('error')
        setResultMessage({
          imported: 0,
          failed: 0,
          error: data.error || data.message || "Une erreur est survenue lors de l'importation.",
        })
        return
      }

      setState('success')
      setResultMessage({
        imported: data.data?.created ?? 0,
        failed: data.data?.errors ?? 0,
      })
    } catch {
      setState('error')
      setResultMessage({
        imported: 0,
        failed: 0,
        error: 'Erreur de connexion au serveur. Veuillez vérifier votre connexion et réessayer.',
      })
    }
  }, [stationId, csvText])

  const previewRows = parseResult ? parseResult.rows.slice(0, 5) : []
  const totalRowCount = parseResult?.totalRows ?? 0
  const previewHeaders = parseResult?.headers ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="border-slate-800 bg-slate-900 shadow-lg">
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Importer des horaires</h3>
                <p className="text-slate-400 text-sm">Glissez-déposez un fichier CSV ou cliquez pour parcourir</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le modèle
            </Button>
          </div>

          {/* Drop zone — visible in idle / dragging states */}
          {(state === 'idle' || state === 'dragging') && (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              role="button"
              tabIndex={0}
              aria-label="Zone de dépôt de fichier CSV"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleBrowseClick()
              }}
              className={`
                relative flex flex-col items-center justify-center gap-3
                rounded-xl border-2 border-dashed cursor-pointer
                transition-all duration-200
                min-h-[180px]
                ${state === 'dragging'
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                }
              `}
            >
              <div className={`rounded-full p-3 transition-colors ${state === 'dragging' ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                <Upload className={`w-6 h-6 transition-colors ${state === 'dragging' ? 'text-emerald-400' : 'text-slate-400'}`} />
              </div>
              <div className="text-center px-4">
                <p className="text-sm text-slate-300 font-medium">
                  {state === 'dragging'
                    ? 'Déposez votre fichier ici'
                    : 'Glissez-déposez votre fichier CSV ici'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ou <span className="text-emerald-400 underline underline-offset-2">cliquez pour parcourir</span>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Preview state — show CSV preview table + confirm */}
          {state === 'preview' && parseResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* File info */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                  <FileSpreadsheet className="w-3 h-3 mr-1.5" />
                  {fileName}
                </Badge>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                  {totalRowCount} ligne{totalRowCount !== 1 ? 's' : ''} détectée{totalRowCount !== 1 ? 's' : ''}
                </Badge>
                {parseResult.errors > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {parseResult.errors} erreur{parseResult.errors !== 1 ? 's' : ''} de parsing
                  </Badge>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/80">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-10">
                          #
                        </th>
                        {previewHeaders.map((header) => (
                          <th
                            key={header}
                            className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="bg-slate-900/60 hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-2 text-xs text-slate-500">{idx + 1}</td>
                          {previewHeaders.map((header) => (
                            <td key={header} className="px-3 py-2 text-xs text-slate-300 whitespace-nowrap">
                              {(row as Record<string, string>)[header] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalRowCount > 5 && (
                  <div className="px-3 py-2 bg-slate-800/50 text-xs text-slate-500 text-center border-t border-slate-800">
                    … et {totalRowCount - 5} autre{totalRowCount - 5 !== 1 ? 's' : ''} ligne{totalRowCount - 5 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmer l&apos;import ({totalRowCount})
                </Button>
              </div>
            </motion.div>
          )}

          {/* Uploading state */}
          {state === 'uploading' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-3 py-8"
            >
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-white">Import en cours…</p>
                <p className="text-xs text-slate-400 mt-1">
                  Traitement de {totalRowCount} ligne{totalRowCount !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.div>
          )}

          {/* Success state */}
          {state === 'success' && resultMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-3 py-6"
            >
              <div className="rounded-full p-3 bg-emerald-500/15">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Import terminé avec succès</p>
                <p className="text-xs text-slate-400 mt-1">
                  {resultMessage.imported} horaire{resultMessage.imported !== 1 ? 's' : ''} importé{resultMessage.imported !== 1 ? 's' : ''}
                  {resultMessage.failed > 0 && (
                    <span className="text-amber-400">
                      {' '}· {resultMessage.failed} échec{resultMessage.failed !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Importer un autre fichier
              </Button>
            </motion.div>
          )}

          {/* Error state */}
          {state === 'error' && resultMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-3 py-6"
            >
              <div className="rounded-full p-3 bg-red-500/15">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Erreur lors de l&apos;import</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  {resultMessage.error}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Réessayer
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
