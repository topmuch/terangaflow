'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePwa } from '@/hooks/use-pwa';

export function InstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = usePwa();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed, can't install, or was dismissed
  const visible = canInstall && !isInstalled && !dismissed;

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result === 'dismissed') {
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto max-w-lg">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-gray-950/95 backdrop-blur-md px-4 py-3 shadow-lg shadow-emerald-500/5">
              {/* App icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xl">
                🚌
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Installer SmartTicketQR
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Accès rapide hors ligne depuis votre écran d&apos;accueil
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Installer</span>
                  <span className="sm:hidden">OK</span>
                </Button>

                <button
                  onClick={handleDismiss}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
