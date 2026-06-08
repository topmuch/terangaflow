"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Audio Segment Types (matching server-side) ─────────────────────────────────

interface DingDongSegment {
  type: "ding-dong";
}

interface TtsSegment {
  type: "tts";
  text: string;
  lang?: string;
}

interface Mp3Segment {
  type: "mp3";
  src: string;
}

type AudioSegment = DingDongSegment | TtsSegment | Mp3Segment;

interface QueueItem {
  id: string;
  type: string;
  title: string | null;
  payload: string | null; // JSON audio segments
  renderedMessage: string | null;
  channel: string;
  priority: number;
}

// ─── Web Audio Ding-Dong ─────────────────────────────────────────────────────

function playDingDong(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new AudioContext();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.value = 0.4;

      // First "ding" — higher pitch (A5 = 880 Hz)
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 880;
      osc1.connect(gainNode);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Second "dong" — lower pitch (E5 = 660 Hz)
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 660;
      osc2.connect(gainNode);
      osc2.start(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.9);

      // Fade out
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);

      osc1.onended = () => {
        osc2.onended = () => {
          ctx.close();
          resolve();
        };
      };
    } catch {
      resolve(); // Audio not available, skip
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
      // Cancel any ongoing speech
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
    if (segment.type === "ding-dong") {
      await playDingDong();
      await new Promise((r) => setTimeout(r, 600));
    } else if (segment.type === "tts") {
      await speak(segment.text, segment.lang);
      await new Promise((r) => setTimeout(r, 500));
    } else if (segment.type === "mp3") {
      // For ding-dong MP3s, use Web Audio API instead
      if (segment.src.includes("ding-dong")) {
        await playDingDong();
      } else {
        try {
          await new Promise<void>((resolve) => {
            const audio = new Audio(segment.src);
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
        } catch {
          // Skip if audio fails
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

// ─── AutoAnnouncer Component ───────────────────────────────────────────────

interface AutoAnnouncerProps {
  stationId: string;
}

export function AutoAnnouncer({ stationId }: AutoAnnouncerProps) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTitle, setLastTitle] = useState<string | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const playingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Unlock audio on first user interaction ──────────────────────────────
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new AudioContext();
        if (ctx.state === "suspended") ctx.resume();
        ctx.close();
      } catch {
        // ignore
      }
      setIsReady(true);
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

  // ─── Process a single announcement ────────────────────────────────────────
  const processAnnouncement = useCallback(async (item: QueueItem) => {
    if (playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    setLastTitle(item.title);

    try {
      let segments: AudioSegment[] | null = null;

      // Parse audio payload if available
      if (item.payload) {
        try {
          segments = JSON.parse(item.payload) as AudioSegment[];
        } catch {
          console.error("[AutoAnnouncer] Failed to parse payload:", item.id);
        }
      }

      // Fallback: use renderedMessage as TTS
      if (!segments && item.renderedMessage) {
        segments = [
          { type: "ding-dong" as const },
          { type: "tts" as const, text: item.renderedMessage },
        ];
      }

      if (segments && segments.length > 0) {
        await playAudioSequence(segments);
      }

      // Mark as completed in DB
      await fetch("/api/announcements/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });

      setPlayCount((prev) => prev + 1);
    } catch (err) {
      console.error("[AutoAnnouncer] Error playing announcement:", err);
    } finally {
      playingRef.current = false;
      setIsPlaying(false);
      setLastTitle(null);
    }
  }, []);

  // ─── Polling loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stationId || !isReady) return;

    const checkAndPlay = async () => {
      if (playingRef.current) return; // Skip if already playing

      try {
        const res = await fetch(`/api/announcements/pending?stationId=${stationId}`);
        if (!res.ok) return;

        const items: QueueItem[] = await res.json();

        if (items.length > 0) {
          // Play the highest priority announcement
          await processAnnouncement(items[0]);
        }
      } catch (err) {
        console.error("[AutoAnnouncer] Poll error:", err);
      }
    };

    // Check immediately on mount
    checkAndPlay();

    // Then poll every 3 seconds
    pollRef.current = setInterval(checkAndPlay, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [stationId, isReady, processAnnouncement]);

  // ─── Render: invisible component — audio plays in background ───────────────
  // We render a small indicator so admins can see it's working
  return (
    <div
      className="fixed bottom-2 right-2 z-50 flex items-center gap-2"
      aria-live="polite"
      aria-label={isPlaying ? `Diffusion en cours: ${lastTitle}` : "Système d'annonces prêt"}
    >
      {/* Ready indicator (tiny dot) */}
      {isReady && !isPlaying && (
        <div className="h-2 w-2 rounded-full bg-emerald-500 opacity-30" title="Auto-annonces actif" />
      )}

      {/* Playing indicator */}
      {isPlaying && lastTitle && (
        <div className="flex items-center gap-2 rounded-lg bg-black/80 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm">
          <div className="flex gap-0.5">
            <span className="inline-block h-2.5 w-0.5 animate-pulse bg-emerald-400" />
            <span className="inline-block h-3.5 w-0.5 animate-pulse bg-emerald-400 [animation-delay:150ms]" />
            <span className="inline-block h-2 w-0.5 animate-pulse bg-emerald-400 [animation-delay:300ms]" />
          </div>
          <span className="text-xs font-medium max-w-[200px] truncate">{lastTitle}</span>
        </div>
      )}
    </div>
  );
}
