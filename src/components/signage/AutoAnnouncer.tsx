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
      gainNode.gain.value = 0.5;

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
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
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
        console.warn("[AutoAnnouncer] speechSynthesis not available");
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
      utterance.onerror = (e) => {
        console.error("[AutoAnnouncer] TTS error:", e);
        resolve();
      };
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
      console.log("[AutoAnnouncer] 🔔 Playing ding-dong...");
      await playDingDong();
      await new Promise((r) => setTimeout(r, 600));
    } else if (segment.type === "tts") {
      console.log(`[AutoAnnouncer] 🗣️ Speaking: "${segment.text}"`);
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

// ─── Unlock Audio Context ───────────────────────────────────────────────────

function unlockAudioContext(): boolean {
  try {
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // Play a silent buffer to fully unlock
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    setTimeout(() => ctx.close(), 100);
    return true;
  } catch {
    return false;
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

  // ─── STEP 1: Unlock audio on first user interaction (CRUCIAL for autoplay) ─
  useEffect(() => {
    const unlock = () => {
      console.log("[AutoAnnouncer] 🔊 User interaction detected. Unlocking audio...");
      const success = unlockAudioContext();
      if (success) {
        setIsAudioUnlocked(true);
        console.log("[AutoAnnouncer] ✅ Audio unlocked successfully!");
      } else {
        console.warn("[AutoAnnouncer] ⚠️ Failed to unlock audio");
      }
      // Remove listeners after first interaction
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

    console.log(`[AutoAnnouncer] 📢 Processing: "${item.title}"`);

    try {
      let segments: AudioSegment[] | null = null;

      // Parse audio payload if available
      if (item.payload) {
        try {
          segments = JSON.parse(item.payload) as AudioSegment[];
          console.log(`[AutoAnnouncer] 📋 Parsed ${segments.length} audio segments`);
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
        console.log("[AutoAnnouncer] ✅ Playback complete");
      }

      // Mark as completed in DB
      try {
        await fetch("/api/announcements/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
        console.log("[AutoAnnouncer] ✅ Marked as played in DB");
      } catch (err) {
        console.error("[AutoAnnouncer] Failed to mark as played:", err);
      }

      setTotalPlayed((prev) => prev + 1);
    } catch (err) {
      console.error("[AutoAnnouncer] ❌ Error playing announcement:", err);
    } finally {
      playingRef.current = false;
      setIsPlaying(false);
      setLastTitle(null);
    }
  }, []);

  // ─── STEP 3: Polling loop — check every 3 seconds ──────────────────────────
  useEffect(() => {
    if (!stationId || !isAudioUnlocked) {
      if (!isAudioUnlocked) {
        console.log("[AutoAnnouncer] ⏳ Audio locked. Waiting for user click on kiosk...");
      }
      return;
    }

    console.log("[AutoAnnouncer] 🔄 Starting polling loop (every 3s)...");

    const checkAndPlay = async () => {
      if (playingRef.current) return; // Skip if already playing

      try {
        const res = await fetch(
          `/api/announcements/pending?stationId=${stationId}`
        );
        if (!res.ok) return;

        const items: QueueItem[] = await res.json();

        const first = items[0];
        if (first) {
          console.log(
            `[AutoAnnouncer] 📢 Found ${items.length} pending announcement(s). Playing highest priority...`
          );
          await processAnnouncement(first);
        }
      } catch (err) {
        console.error("[AutoAnnouncer] ❌ Poll error:", err);
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
  }, [stationId, isAudioUnlocked, processAnnouncement]);

  // ─── STEP 4: Render ─────────────────────────────────────────────────────────
  // If audio not unlocked: show a VISIBLE activation button (CRITICAL for kiosk)
  if (!isAudioUnlocked) {
    return (
      <button
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black px-5 py-3.5 rounded-xl font-bold shadow-2xl cursor-pointer transition-all hover:scale-105 animate-pulse"
        onClick={() => {
          // This click will trigger the useEffect unlock listener above
          unlockAudioContext();
          setIsAudioUnlocked(true);
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

  // Audio unlocked — show small status indicator
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
      {/* Ready indicator (tiny green dot) */}
      {!isPlaying && (
        <div
          className="h-2 w-2 rounded-full bg-emerald-500 opacity-30"
          title={`Auto-annonces actif (${totalPlayed} jouées)`}
        />
      )}

      {/* Playing indicator */}
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

// ─── Inline SVG icon to avoid lucide import issues ────────────────────────────

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
