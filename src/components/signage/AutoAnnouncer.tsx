"use client";

import { useEffect, useRef, useState } from "react";
import { playAnnouncement } from "@/lib/audioEngine";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  type: string;
  title: string | null;
  payload: string | null; // JSON array of text strings
  channel: string;
  priority: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// KIOSK AUTO-ANNOUNCER
//
// Politique ZÉRO AUDIO MP3:
//   - Ding-Dong synthétisé via Web Audio API (2 tons : 880Hz → 660Hz)
//   - TTS via window.speechSynthesis (fr-FR, vitesse 0.92 style gare SNCF)
//   - Le payload contient un JSON array de textes
//   - Chaque texte est joué : Ding-Dong → pause 600ms → TTS
//
// Pour un fonctionnement ZÉRO CLIC en production, l'écran kiosk DOIT
// être dans un navigateur avec autoplay autorisé (Fully Kiosk, Chrome flag, etc.)
//
// ═══════════════════════════════════════════════════════════════════════════════

interface AutoAnnouncerProps {
  stationId: string;
}

export function AutoAnnouncer({ stationId }: AutoAnnouncerProps) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTitle, setLastTitle] = useState<string | null>(null);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const playingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── STEP 1: Audio unlock ──────────────────────────────────────────────────
  useEffect(() => {
    const unlock = () => {
      try {
        // Test silencieux pour débloquer l'AudioContext & SpeechSynthesis
        const ACtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!ACtor) return;
        const ctx = new ACtor();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => {
          ctx.close();
          setIsReady(true);
          console.log("[AutoAnnouncer] ✅ Audio unlocked");
        }, 100);
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };

    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
    // Tente un déverrouillage immédiat (kiosk mode)
    unlock();

    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  // ─── STEP 2: Polling + Lecture ───────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !stationId) return;

    console.log("[AutoAnnouncer] 🔄 Starting polling loop (every 3s)...");

    const checkQueue = async () => {
      if (playingRef.current) return;

      try {
        // 1. Déclenche les annonces automatiques (départs, rappels, retards)
        await fetch(`/api/announcements/check-auto?stationId=${stationId}`, {
          method: "POST",
        }).catch(() => {});

        // 2. Récupère la file d'attente
        const res = await fetch(
          `/api/announcements/pending?stationId=${stationId}`
        );
        if (!res.ok) return;

        const items: QueueItem[] = await res.json();

        if (items.length > 0) {
          const next = items[0];
          if (next) {
            playingRef.current = true;
            setIsPlaying(true);
            setLastTitle(next.title);

            console.log(
              `[AutoAnnouncer] 📢 Processing: "${next.title}" (id: ${next.id.substring(0, 8)}...)`
            );

            // Parse payload: JSON array of text strings
            let messages: string[] = [];
            if (next.payload) {
              try {
                messages = JSON.parse(next.payload) as string[];
              } catch {
                console.error("[AutoAnnouncer] Failed to parse payload");
              }
            }

            // Joue chaque message séquentiellement (Ding-Dong + TTS)
            if (messages.length > 0) {
              console.log(
                `[AutoAnnouncer] 📋 ${messages.length} message(s) to play`
              );
              for (const msg of messages) {
                await playAnnouncement(msg);
              }
              console.log("[AutoAnnouncer] ✅ Playback complete");
            }

            // Marque comme joué
            await fetch("/api/announcements/mark-played", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: next.id }),
            })
              .then((markRes) => {
                if (markRes.ok) {
                  console.log("[AutoAnnouncer] ✅ Marked as played");
                }
              })
              .catch(() => {});

            setTotalPlayed((prev) => prev + 1);
            playingRef.current = false;
            setIsPlaying(false);
            setLastTitle(null);
          }
        }
      } catch (err) {
        console.error("[AutoAnnouncer] ❌ Poll error:", err);
        playingRef.current = false;
        setIsPlaying(false);
      }
    };

    // Check immediately
    checkQueue();

    // Poll every 3 seconds
    pollRef.current = setInterval(checkQueue, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [stationId, isReady]);

  // ─── STEP 3: Render ──────────────────────────────────────────────────────
  // Show unlock button if audio is blocked (non-kiosk browsers fallback)
  if (!isReady) {
    return (
      <button
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-5 py-3.5 rounded-xl font-bold shadow-2xl cursor-pointer transition-all hover:scale-105 animate-pulse"
        onClick={() => {
          const ACtor = window.AudioContext || (window as any).webkitAudioContext;
          if (!ACtor) return;
          const ctx = new ACtor();
          const osc = ctx.createOscillator();
          osc.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            ctx.close();
            setIsReady(true);
          }, 100);
          window.speechSynthesis?.cancel();
        }}
        aria-label="Activer le son de la gare"
      >
        <Volume2Icon />
        <div className="text-left">
          <div className="text-sm">CLIQUER ICI POUR</div>
          <div className="text-sm">ACTIVER LE SON</div>
        </div>
      </button>
    );
  }

  // Audio ready — tiny status indicator
  return (
    <div
      className="fixed bottom-2 right-2 z-50 flex items-center gap-2"
      aria-live="polite"
      aria-label={
        isPlaying
          ? `Diffusion en cours: ${lastTitle}`
          : "Système d'annonces prêt"
      }
    >
      {!isPlaying && (
        <div
          className="h-2 w-2 rounded-full bg-emerald-500 opacity-30"
          title={`Auto-annonces actif (${totalPlayed} jouées)`}
        />
      )}

      {isPlaying && lastTitle && (
        <div className="flex items-center gap-2 rounded-lg bg-black/80 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm">
          <div className="flex gap-0.5">
            <span className="inline-block h-2.5 w-0.5 animate-pulse bg-emerald-400" />
            <span className="inline-block h-3.5 w-0.5 animate-pulse bg-emerald-400 [animation-delay:150ms]" />
            <span className="inline-block h-2 w-0.5 animate-pulse bg-emerald-400 [animation-delay:300ms]" />
          </div>
          <span className="text-xs font-medium max-w-[200px] truncate">
            {lastTitle}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Inline SVG icon ────────────────────────────────────────────────────────────

function Volume2Icon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
