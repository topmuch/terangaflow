'use client'

// ============================================================
// White Label Theme Customizer Panel
// ============================================================
// Visual theme editor allowing tenants to customize branding.
// Features: preset selector, color pickers, live preview, save/reset.

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette,
  Paintbrush,
  RotateCcw,
  Save,
  Sparkles,
  Eye,
  Check,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

import { useWhiteLabelStore } from '@/lib/whitelist-store'
import {
  themePresets,
  defaultTheme,
  type WhiteLabelTheme,
} from '@/lib/whitelist-presets'

interface ThemeCustomizerProps {
  tenantId: string
  stationName: string
}

// --- Color Swatches ---
const primarySwatches = [
  '#10b981', '#059669', '#0d9488', '#0ea5e9', '#6366f1',
  '#8b5cf6', '#d946ef', '#ec4899', '#e11d48', '#f59e0b',
  '#f97316', '#ef4444', '#84cc16', '#14b8a6', '#06b6d4',
]

const accentSwatches = [
  '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d946ef',
  '#84cc16', '#10b981', '#059669', '#0d9488', '#22d3ee',
]

export default function ThemeCustomizer({ tenantId, stationName }: ThemeCustomizerProps) {
  const { setTheme, resetTheme, theme } = useWhiteLabelStore()
  const { toast } = useToast()

  // Local editing state (not committed until save)
  const [localTheme, setLocalTheme] = useState<WhiteLabelTheme>({
    tenantId,
    appName: stationName || 'SmartTicketQR',
    tagline: '',
    primaryColor: '#10b981',
    accentColor: '#14b8a6',
    hideBranding: false,
  })

  const [activePresetId, setActivePresetId] = useState<string | null>('smartticketqr')
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Hydrate from store on mount
  useEffect(() => {
    if (theme && theme.tenantId === tenantId) {
      setLocalTheme({ ...theme })
    } else {
      setLocalTheme({
        tenantId,
        appName: stationName || defaultTheme.appName,
        tagline: '',
        primaryColor: defaultTheme.primaryColor,
        accentColor: defaultTheme.accentColor,
        hideBranding: false,
      })
    }
  }, [theme, tenantId, stationName])

  // Apply preset instantly
  const applyPreset = useCallback((presetId: string) => {
    if (presetId === 'custom') {
      setActivePresetId('custom')
      return
    }

    const preset = themePresets.find((p) => p.id === presetId)
    if (preset) {
      const newTheme: WhiteLabelTheme = {
        ...preset.theme,
        tenantId,
      }
      setLocalTheme(newTheme)
      setActivePresetId(presetId)
      setTheme(newTheme)
      toast({
        title: 'Préréglage appliqué',
        description: `Thème "${preset.name}" appliqué avec succès.`,
      })
    }
  }, [tenantId, setTheme, toast])

  // Update a single field
  const updateField = useCallback(
    <K extends keyof WhiteLabelTheme>(key: K, value: WhiteLabelTheme[K]) => {
      setLocalTheme((prev) => {
        const updated = { ...prev, [key]: value }
        // Mark as custom when user manually changes colors
        if (key === 'primaryColor' || key === 'accentColor') {
          setActivePresetId('custom')
        }
        return updated
      })
    },
    []
  )

  // Save theme to store + API
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // Save to local store
      setTheme(localTheme)

      // Try to persist to API
      try {
        await fetch('/api/whitelist/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, theme: localTheme }),
        })
      } catch {
        // API save is best-effort — local save always succeeds
      }

      toast({
        title: 'Thème sauvegardé',
        description: `"${localTheme.appName}" est maintenant votre thème actif.`,
      })
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le thème.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [localTheme, tenantId, setTheme, toast])

  // Reset to defaults
  const handleReset = useCallback(() => {
    const resetData: WhiteLabelTheme = {
      ...defaultTheme,
      tenantId,
    }
    setLocalTheme(resetData)
    setActivePresetId('smartticketqr')
    resetTheme()
    toast({
      title: 'Réinitialisé',
      description: 'Thème par défaut SmartTicketQR restauré.',
    })
  }, [tenantId, resetTheme, toast])

  // Live preview apply
  useEffect(() => {
    setTheme(localTheme)
  }, [localTheme, setTheme])

  return (
    <div className="space-y-6">
      {/* --- Preset Selector --- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Préréglages de thème
          </CardTitle>
          <CardDescription>
            Choisissez un thème préconfiguré ou personnalisez librement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {themePresets.map((preset) => (
              <motion.button
                key={preset.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => applyPreset(preset.id)}
                className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                  activePresetId === preset.id
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
                }`}
              >
                {/* Color preview bar */}
                <div
                  className={`h-8 w-full rounded-md bg-gradient-to-r ${preset.previewGradient}`}
                />
                <span className="text-xs font-medium">{preset.name}</span>
                {activePresetId === preset.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-1.5 top-1.5"
                  >
                    <Check className="h-4 w-4 text-primary" />
                  </motion.div>
                )}
              </motion.button>
            ))}
            {/* Custom option */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActivePresetId('custom')}
              className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                activePresetId === 'custom'
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
              }`}
            >
              <div className="flex h-8 w-full items-center justify-center rounded-md bg-gradient-to-r from-muted to-muted-foreground/20">
                <Palette className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium">Personnalisé</span>
              {activePresetId === 'custom' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-1.5 top-1.5"
                >
                  <Check className="h-4 w-4 text-primary" />
                </motion.div>
              )}
            </motion.button>
          </div>
        </CardContent>
      </Card>

      {/* --- Theme Editor --- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paintbrush className="h-4 w-4" />
            Personnalisation
          </CardTitle>
          <CardDescription>
            Modifiez les couleurs et le texte de votre marque
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* App Name */}
          <div className="space-y-2">
            <Label htmlFor="wl-app-name">Nom de l&apos;application</Label>
            <Input
              id="wl-app-name"
              value={localTheme.appName}
              onChange={(e) => updateField('appName', e.target.value)}
              placeholder="Ex: Gare de Dakar"
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              Affiché en en-tête et dans le titre de la page
            </p>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label htmlFor="wl-tagline">Slogan</Label>
            <Input
              id="wl-tagline"
              value={localTheme.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder="Ex: Votre gare, votre voyage"
              maxLength={80}
            />
          </div>

          <Separator />

          {/* Primary Color */}
          <div className="space-y-3">
            <Label>Couleur principale</Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={localTheme.primaryColor}
                  onChange={(e) => updateField('primaryColor', e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-border"
                />
              </div>
              <Input
                value={localTheme.primaryColor}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                    updateField('primaryColor', e.target.value)
                  }
                }}
                placeholder="#10b981"
                className="w-32 font-mono"
                maxLength={7}
              />
            </div>
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2">
              {primarySwatches.map((color) => (
                <button
                  key={`primary-${color}`}
                  onClick={() => updateField('primaryColor', color)}
                  className="group relative"
                  title={color}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      localTheme.primaryColor.toLowerCase() === color.toLowerCase()
                        ? 'border-foreground scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <Label>Couleur d&apos;accent</Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={localTheme.accentColor}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-border"
                />
              </div>
              <Input
                value={localTheme.accentColor}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                    updateField('accentColor', e.target.value)
                  }
                }}
                placeholder="#14b8a6"
                className="w-32 font-mono"
                maxLength={7}
              />
            </div>
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2">
              {accentSwatches.map((color) => (
                <button
                  key={`accent-${color}`}
                  onClick={() => updateField('accentColor', color)}
                  className="group relative"
                  title={color}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      localTheme.accentColor.toLowerCase() === color.toLowerCase()
                        ? 'border-foreground scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Hide Branding Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="wl-hide-branding" className="text-sm">
                Masquer la marque SmartTicketQR
              </Label>
              <p className="text-xs text-muted-foreground">
                Remplacer le filigrane par votre propre marque
              </p>
            </div>
            <Switch
              id="wl-hide-branding"
              checked={localTheme.hideBranding}
              onCheckedChange={(checked) => updateField('hideBranding', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* --- Live Preview --- */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Aperçu en direct
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Masquer' : 'Afficher'}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  {/* Preview Header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ backgroundColor: localTheme.primaryColor }}
                  >
                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Palette className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">
                        {localTheme.appName || 'SmartTicketQR'}
                      </p>
                      {localTheme.tagline && (
                        <p className="text-xs text-white/70">
                          {localTheme.tagline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preview Body */}
                  <div className="bg-background p-4 space-y-3">
                    {/* Sample display */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Prochain départ</p>
                        <p className="text-sm font-semibold">Dakar → Saint-Louis</p>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: localTheme.accentColor }}
                      >
                        14:30
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Quai</p>
                        <p className="text-sm font-semibold">Quai 3</p>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: localTheme.primaryColor }}
                      >
                        À l&apos;heure
                      </div>
                    </div>

                    {/* Branding watermark */}
                    {!localTheme.hideBranding && (
                      <div className="pt-2 border-t">
                        <p className="text-center text-[10px] text-muted-foreground/50">
                          Propulsé par SmartTicketQR
                        </p>
                      </div>
                    )}
                    {localTheme.hideBranding && (
                      <div className="pt-2 border-t">
                        <p className="text-center text-[10px]" style={{ color: localTheme.primaryColor + '80' }}>
                          {localTheme.appName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* --- Action Buttons --- */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
          style={{
            backgroundColor: localTheme.primaryColor,
            borderColor: localTheme.primaryColor,
          }}
        >
          {isSaving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
            />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Sauvegarder
        </Button>
      </div>
    </div>
  )
}
