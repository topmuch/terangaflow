"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Audio Segment Types (matching server-side) ─────────────────────────────────

type AudioSegment = { type: "mp3"; src: string } | { type: "tts"; text: string; lang?: string };

interface QueueItem {
  id: string;
  type: string;
  title: string | null;
  payload: string | null; // JSON audio segments
  renderedMessage: string | null;
  channel: string;
  priority: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//
// ZERO-CLICK AUDIO POLICY:
//
// Pour un fonctionnement "ZÉRO CLIC" garanti en production,
// cet écran kiosk DOIT être affiché dans un navigateur avec l'option
// "Autoriser l'autoplay" activée.
//
// Options recommandées :
//   - Fully Kiosk Browser (Android) → Settings → Advanced → Autoplay: Allow
//   - Chrome/Edge avec le flag: --autoplay-policy=no-user-gesture-required
//   - Un helper local Node.js pour la sortie audio (hors scope navigateur)
//
// Le code ci-dessous tente le déverrouillage automatique au premier render
// ET réessaie à chaque cycle de polling si l'audio est toujours bloqué.
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Play MP3 File ────────────────────────────────────────────────────────────

function playMp3(src: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(src);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

// ─── TTS Helper ─────────────────────────────────────────────────────────────

function speak(text: string, lang = "fr-FR"): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

// ─── Play Audio Sequence ─────────────────────────────────────────────────────

async function playAudioSequence(segments: AudioSegment[]): Promise<void> {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }

  for (const segment of segments) {
    if (segment.type === "mp3") {
      console.log(`[AutoAnnouncer] 🎵 Playing: ${segment.src}`);
      await playMp3(segment.src);
      await new Promise((r) => setTimeout(r, 500));
    } else if (segment.type === "tts") {
      console.log(`[AutoAnnouncer] 🗣️ Speaking: "${segment.text}"`);
      await speak(segment.text, segment.lang);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}

// ─── AutoAnnouncer Component ───────────────────────────────────────────────

interface AutoAnnouncerProps {
  stationId: string;
}

export function AutoAnnouncer({ stationId }: AutoAnnouncerProps) {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTitle, setLastTitle] = useState<string | null>(null);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const playingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── STEP 1: Attempt audio unlock ──────────────────────────────────────────
  // Tries immediately on mount, plus on first user interaction as fallback.
  useEffect(() => {
    // Try immediate unlock (works in kiosk browsers with autoplay allowed)
    const tryUnlock = () => {
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        audio.volume = 0;
        const playPromise = audio.play();
        if (playPromise) {
          playPromise
            .then(() => {
              audio.pause();
              audio.currentTime = 0;
              if (!isAudioUnlocked) {
                setIsAudioUnlocked(true);
                console.log("[AutoAnnouncer] ✅ Audio unlocked automatically (kiosk mode)");
              }
            })
            .catch(() => {
              // Autoplay blocked — will retry on user click
            });
        }
      } catch {
        // ignore
      }
    };

    // Try immediately
    tryUnlock();

    // Fallback: try on first user click/touch
    const unlock = () => {
      tryUnlock();
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
    };

    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
    document.addEventListener("keydown", unlock);

    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // ─── STEP 2: Process a single announcement from queue ─────────────────────
  const processAnnouncement = useCallback(async (item: QueueItem) => {
    if (playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    setLastTitle(item.title);

    console.log(`[AutoAnnouncer] 📢 Processing: "${item.title}" (id: ${item.id.substring(0, 8)}...)`);

    try {
      let segments: AudioSegment[] | null = null;

      if (item.payload) {
        try {
          segments = JSON.parse(item.payload) as AudioSegment[];
          console.log(`[AutoAnnouncer] 📋 ${segments.length} audio segment(s)`);
        } catch {
          console.error("[AutoAnnouncer] Failed to parse payload");
        }
      }

      // Fallback: use renderedMessage as TTS
      if (!segments && item.renderedMessage) {
        segments = [
          { type: "mp3", src: "/audio/ding-dong.mp3" },
          { type: "tts", text: item.renderedMessage },
        ];
      }

      if (segments && segments.length > 0) {
        await playAudioSequence(segments);
        console.log("[AutoAnnouncer] ✅ Playback complete");
      }

      // Mark as played in DB
      try {
        const markRes = await fetch("/api/announcements/mark-played", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
        if (markRes.ok) {
          console.log(`[AutoAnnouncer] ✅ Marked as played`);
        }
      } catch (err) {
        console.error("[AutoAnnouncer] Failed to mark as played:", err);
      }

      setTotalPlayed((prev) => prev + 1);
    } catch (err) {
      console.error("[AutoAnnouncer] ❌ Error:", err);
    } finally {
      playingRef.current = false;
      setIsPlaying(false);
      setLastTitle(null);
    }
  }, []);

  // ─── STEP 3: Polling loop — check every 3 seconds ──────────────────────────
  useEffect(() => {
    if (!stationId) return;

    console.log("[AutoAnnouncer] 🔄 Starting polling loop (every 3s)...");

    const checkAndPlay = async () => {
      if (playingRef.current) return;

      try {
        // 1. Trigger automatic scheduler (boarding, imminent, reminders)
        await fetch(`/api/announcements/check-auto?stationId=${stationId}`, {
          method: "POST",
        }).catch(() => {});

        // 2. Fetch pending announcements
        const res = await fetch(
          `/api/announcements/pending?stationId=${stationId}`
        );
        if (!res.ok) return;

        const items: QueueItem[] = await res.json();

        if (items.length > 0) {
          const first = items[0];
          if (first) {
            // If audio is locked, try to unlock before playing
            if (!isAudioUnlocked) {
              try {
                const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
                audio.volume = 0;
                await audio.play().catch(() => {});
                audio.pause();
                setIsAudioUnlocked(true);
                console.log("[AutoAnnouncer] ✅ Audio unlocked via polling trigger");
              } catch {
                // Still locked — skip this announcement
                console.warn("[AutoAnnouncer] ⚠️ Audio still locked, skipping announcement");
                return;
              }
            }

            await processAnnouncement(first);
          }
        }
      } catch (err) {
        console.error("[AutoAnnouncer] ❌ Poll error:", err);
      }
    };

    // Check immediately
    checkAndPlay();

    // Poll every 3 seconds
    pollRef.current = setInterval(checkAndPlay, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [stationId, isAudioUnlocked, processAnnouncement]);

  // ─── STEP 4: Render ─────────────────────────────────────────────────────────
  // Show unlock button ONLY if audio is blocked (fallback for non-kiosk browsers)
  if (!isAudioUnlocked) {
    return (
      <button
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-5 py-3.5 rounded-xl font-bold shadow-2xl cursor-pointer transition-all hover:scale-105 animate-pulse"
        onClick={() => {
          const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
          audio.volume = 0;
          audio.play().then(() => {
            audio.pause();
            setIsAudioUnlocked(true);
          }).catch(() => {});
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
