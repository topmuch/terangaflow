'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export function OfflineFallback() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOffline(false);
    setJustReconnected(true);
    // Show success state briefly, then hide
    const timer = setTimeout(() => {
      setJustReconnected(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    setJustReconnected(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 2000);
    } else {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-40 flex items-center justify-center"
        >
          {/* Semi-transparent backdrop to dim content underneath */}
          <div className="absolute inset-0 bg-[#0B0F19]/95 backdrop-blur-md" />

          {/* Content */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative z-10 mx-4 w-full max-w-sm text-center"
          >
            <AnimatePresence mode="wait">
              {justReconnected ? (
                <motion.div
                  key="reconnected"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Success state */}
                  <div className="flex justify-center mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        damping: 15,
                        stiffness: 200,
                        delay: 0.1,
                      }}
                      className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1">
                    De nouveau en ligne
                  </h2>
                  <p className="text-sm text-slate-400">
                    La connexion a été rétablie avec succès.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="offline"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Animated WifiOff icon */}
                  <div className="flex justify-center mb-5">
                    <motion.div
                      animate={{
                        y: [0, -6, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"
                    >
                      <WifiOff className="w-10 h-10 text-cyan-400" />
                    </motion.div>
                  </div>

                  <h2 className="text-xl font-bold text-white mb-2">
                    Hors connexion
                  </h2>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Vérifiez votre connexion internet et réessayez
                  </p>

                  {/* Retry button */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRetry}
                    className="w-full min-h-[44px] py-3 px-6 rounded-xl font-semibold text-sm gradient-bg-animated text-white shadow-lg cursor-pointer"
                  >
                    Réessayer
                  </motion.button>

                  <p className="text-[10px] text-slate-600 mt-4">
                    TerangaFlow — L&apos;intelligence des gares du Sénégal
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
