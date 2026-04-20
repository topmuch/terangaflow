'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing } from 'lucide-react';

interface PushOptInModalProps {
  open: boolean;
  onClose: () => void;
  onAllow: () => void;
  stationName?: string;
}

export function PushOptInModal({ open, onClose, onAllow, stationName }: PushOptInModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-sm bg-[#0B0F19] rounded-2xl border border-white/10 p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="push-optin-title"
          >
            {/* Animated bell icon */}
            <div className="flex justify-center mb-5">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"
              >
                <BellRing className="w-8 h-8 text-cyan-400" />
                {/* Pulse ring */}
                <motion.span
                  animate={{
                    scale: [1, 1.5],
                    opacity: [0.4, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 rounded-full border-2 border-cyan-400"
                />
              </motion.div>
            </div>

            {/* Title */}
            <h2
              id="push-optin-title"
              className="text-xl font-bold text-center text-white mb-2"
            >
              Restez informé
            </h2>

            {/* Description */}
            <p className="text-sm text-center text-slate-400 leading-relaxed mb-6">
              {stationName
                ? `Recevez les alertes de la gare de ${stationName} : retards, annulations, changements de quai et messages spéciaux directement sur votre appareil.`
                : 'Recevez les alertes de votre gare : retards, annulations, changements de quai et messages spéciaux directement sur votre appareil.'}
            </p>

            {/* Buttons */}
            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onAllow}
                className="w-full min-h-[44px] py-3 px-6 rounded-xl font-semibold text-sm gradient-bg-animated text-white shadow-lg cursor-pointer"
              >
                Autoriser les notifications
              </motion.button>

              <button
                onClick={onClose}
                className="w-full min-h-[44px] py-3 px-6 rounded-xl font-medium text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
              >
                Plus tard
              </button>
            </div>

            {/* RGPD mention */}
            <p className="text-[10px] text-slate-600 text-center mt-4 leading-relaxed">
              Conformément au RGPD, vos données de notification sont traitées de manière confidentielle. Vous pouvez retirer votre consentement à tout moment dans les paramètres.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
