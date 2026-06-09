"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdData {
  id: string;
  type: "YOUTUBE" | "VIDEO" | "IMAGE";
  url: string;
  durationSeconds: number;
  name?: string;
}

interface AdFullscreenPlayerProps {
  stationId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// LECTEUR PUBLICITAIRE FULLSCREEN KIOSK
//
// Ce composant reste invisible (null) jusqu'à ce que l'API lui dise
// de jouer une pub. Quand c'est le cas, il recouvre tout l'écran
// (z-[100]), joue le média, puis se ferme automatiquement après
// la durée configurée.
//
// Types supportés :
//   - IMAGE  : Affiche une image statique pendant durationSeconds
//   - VIDEO  : Lit une vidéo .mp4 (autoplay, muted)
//   - YOUTUBE : Embed YouTube avec autoplay=1&mute=1
//
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdFullscreenPlayer({ stationId }: AdFullscreenPlayerProps) {
  const [activeAd, setActiveAd] = useState<AdData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef(false);

  // 1. Vérifier périodiquement s'il y a une pub à jouer (toutes les 10 secondes)
  useEffect(() => {
    if (activeAd) return; // Ne pas vérifier si une pub est déjà en cours

    const checkAd = async () => {
      if (cooldownRef.current) return;

      try {
        const res = await fetch(
          `/api/kiosk-ads/check?stationId=${stationId}`
        );
        const ad = await res.json();
        if (ad) {
          setActiveAd(ad);
          setTimeLeft(ad.durationSeconds);
          setVisible(true);
          cooldownRef.current = true;

          // Cooldown de 5s après fermeture pour éviter les répétitions rapprochées
          setTimeout(() => {
            cooldownRef.current = false;
          }, 5000);
        }
      } catch (err) {
        console.error("[AdFullscreenPlayer] Erreur vérification pub:", err);
      }
    };

    // Vérifier immédiatement
    checkAd();

    // Puis toutes les 10 secondes
    const interval = setInterval(checkAd, 10000);
    return () => clearInterval(interval);
  }, [stationId, activeAd]);

  // 2. Compte à rebours + fermeture automatique
  useEffect(() => {
    if (!visible || !activeAd) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setVisible(false);
          setTimeout(() => setActiveAd(null), 500); // Délai pour l'animation de sortie
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, activeAd]);

  // 3. Extraction de l'ID YouTube pour l'embed avec autoplay
  const getYouTubeEmbedUrl = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId =
      match && match[2] && match[2].length === 11 ? match[2] : null;
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1`;
  };

  return (
    <AnimatePresence>
      {visible && activeAd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
        >
          {/* Barre de progression en haut */}
          <div className="absolute top-0 left-0 w-full h-2 bg-slate-800 z-[101]">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-1000 ease-linear"
              style={{
                width: `${(timeLeft / activeAd.durationSeconds) * 100}%`,
              }}
            />
          </div>

          {/* Bouton de fermeture (semi-transparent) */}
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(() => setActiveAd(null), 500);
              if (timerRef.current) clearInterval(timerRef.current);
            }}
            className="absolute top-4 right-4 z-[102] flex items-center gap-2 bg-red-600/70 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold opacity-40 hover:opacity-100 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span className="text-sm">{timeLeft}s</span>
          </button>

          {/* CONTENU MÉDIA */}
          <div className="w-full h-full flex items-center justify-center bg-black">
            {activeAd.type === "YOUTUBE" && (() => {
              const embedUrl = getYouTubeEmbedUrl(activeAd.url);
              if (!embedUrl) return null; // URL YouTube invalide → sauter
              return (
                <iframe
                  key={activeAd.id}
                  src={embedUrl}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={activeAd.name ?? "Publicité"}
                />
              );
            })()}

            {activeAd.type === "VIDEO" && (
              <video
                key={activeAd.id}
                src={activeAd.url}
                autoPlay
                muted // Requis pour l'autoplay fiable sur tous les navigateurs
                playsInline
                className="w-full h-full object-contain"
              />
            )}

            {activeAd.type === "IMAGE" && (
              <motion.img
                key={activeAd.id}
                src={activeAd.url}
                alt={activeAd.name ?? "Publicité"}
                className="w-full h-full object-contain bg-black"
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
              />
            )}
          </div>

          {/* Label "Publicité" discret en bas */}
          <div className="absolute bottom-4 left-4 z-[101]">
            <span className="text-xs text-white/30 font-medium tracking-wider uppercase">
              Publicité
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
