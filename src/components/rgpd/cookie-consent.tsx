'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, Shield, Settings, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useConsent, type ConsentData } from '@/hooks/use-consent'

export function CookieConsent() {
  const { consent, hasConsented, saveConsent, acceptAll, reject } = useConsent()
  const [hasDismissedBanner, setHasDismissedBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localConsent, setLocalConsent] = useState<ConsentData>(consent)

  const showBanner = hasConsented ? false : !hasDismissedBanner

  const handleSaveSettings = () => {
    saveConsent(localConsent)
    setShowSettings(false)
    setHasDismissedBanner(true)
  }

  const handleAcceptAll = () => {
    acceptAll()
    setHasDismissedBanner(true)
  }

  const handleReject = () => {
    reject()
    setHasDismissedBanner(true)
  }

  const handleOpenSettings = () => {
    setLocalConsent(consent)
    setShowSettings(true)
  }

  return (
    <>
      {/* Banner — slides up from bottom */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
          >
            <div className="mx-auto max-w-4xl rounded-xl border border-border bg-background/95 backdrop-blur-md p-4 sm:p-6 shadow-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: Icon + text */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                    <Cookie className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Nous utilisons des cookies
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      SmartTicketQR utilise des cookies pour améliorer votre expérience, mesurer
                      l&apos;audience et vous proposer des contenus adaptés. Conformément au RGPD,
                      vous pouvez personnaliser vos préférences à tout moment.
                    </p>
                  </div>
                </div>

                {/* Right: buttons */}
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                  <Button size="sm" onClick={handleAcceptAll} className="gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Tout accepter
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleReject} className="gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    Refuser
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleOpenSettings} className="gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    Personnaliser
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-amber-500" />
              Préférences de cookies
            </DialogTitle>
            <DialogDescription>
              Gérez vos préférences de cookies conformément au RGPD. Les cookies essentiels sont
              nécessaires au bon fonctionnement du site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Essential cookies — always on */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-500 mt-0.5">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cookies essentiels</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nécessaires au fonctionnement du site. Ils ne peuvent pas être désactivés.
                  </p>
                </div>
              </div>
              <Switch checked disabled />
            </div>

            <Separator />

            {/* Analytics cookies */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-500 mt-0.5">
                  <Cookie className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cookies analytiques</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Nous aident à comprendre comment les visiteurs utilisent le site pour
                    l&apos;améliorer.
                  </p>
                </div>
              </div>
              <Switch
                checked={localConsent.analytics}
                onCheckedChange={(checked) =>
                  setLocalConsent((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            <Separator />

            {/* Marketing cookies */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-500/15 text-rose-500 mt-0.5">
                  <Cookie className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cookies marketing</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Utilisés pour vous proposer des publicités et contenus personnalisés.
                  </p>
                </div>
              </div>
              <Switch
                checked={localConsent.marketing}
                onCheckedChange={(checked) =>
                  setLocalConsent((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          {/* Dialog actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setShowSettings(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSaveSettings} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating settings button — visible after consent */}
      <AnimatePresence>
        {hasConsented && !showBanner && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.2 }}
            onClick={handleOpenSettings}
            className="fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-lg hover:bg-accent transition-colors"
            aria-label="Paramètres des cookies"
            title="Paramètres des cookies"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
