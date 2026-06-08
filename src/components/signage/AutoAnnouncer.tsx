"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Audio Segment Types (matching server-side) ─────────────────────────────────

interface TtsSegment {
  type: "tts";
  text: string;
  lang?: string;
}

interface Mp3Segment {
  type: "mp3";
  src: string;
}

type AudioSegment = TtsSegment | Mp3Segment;

interface QueueItem {
  id: string;
  type: string;
  title: string | null;
  payload: string | null; // JSON audio segments
  renderedMessage: string | null;
  channel: string;
  priority: number;
}

// ─── Play MP3 File ────────────────────────────────────────────────────────────

function playMp3(src: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(src);
      audio.onended = () => {
        console.log(`[AutoAnnouncer] ✅ MP3 finished: ${src}`);
        resolve();
      };
      audio.onerror = (e) => {
        console.warn(`[AutoAnnouncer] ⚠️ MP3 error for ${src}:`, e);
        resolve(); // Skip on error, don't block
      };
      audio.play().catch((err) => {
        console.warn(`[AutoAnnouncer] ⚠️ MP3 play() blocked for ${src}:`, err);
        resolve();
      });
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
      utterance.onend = () => {
        console.log(`[AutoAnnouncer] ✅ TTS finished: "${text.substring(0, 60)}..."`);
        resolve();
      };
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
    if (segment.type === "mp3") {
      console.log(`[AutoAnnouncer] 🎵 Playing MP3: ${segment.src}`);
      await playMp3(segment.src);
      await new Promise((r) => setTimeout(r, 500)); // Pause between segments
    } else if (segment.type === "tts") {
      console.log(`[AutoAnnouncer] 🗣️ Speaking: "${segment.text}"`);
      await speak(segment.text, segment.lang);
      await new Promise((r) => setTimeout(r, 400)); // Pause between segments
    }
  }
}

// ─── Unlock Audio Context ───────────────────────────────────────────────────

function unlockAudioContext(): boolean {
  try {
    // Play a tiny silent audio to unlock browser autoplay policy
    const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
    audio.volume = 0;
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {
        // ignore
      });
    }
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

    console.log(`[AutoAnnouncer] 📢 ═══════════════════════════════════════`);
    console.log(`[AutoAnnouncer] 📢 Processing: "${item.title}"`);
    console.log(`[AutoAnnouncer] 📢 Type: ${item.type} | Channel: ${item.channel} | Priority: ${item.priority}`);
    console.log(`[AutoAnnouncer] 📢 Payload raw: ${item.payload?.substring(0, 120)}...`);
    console.log(`[AutoAnnouncer] 📢 Fallback message: ${item.renderedMessage}`);

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
          { type: "mp3", src: "/audio/ding-dong.mp3" },
          { type: "tts", text: item.renderedMessage },
        ];
      }

      if (segments && segments.length > 0) {
        await playAudioSequence(segments);
        console.log("[AutoAnnouncer] ✅ Playback complete");
      }

      // Mark as completed in DB via /api/announcements/mark-played
      try {
        const markRes = await fetch("/api/announcements/mark-played", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
        if (markRes.ok) {
          console.log(`[AutoAnnouncer] ✅ Marked as played in DB (id: ${item.id})`);
        } else {
          console.error(`[AutoAnnouncer] ⚠️ mark-played returned ${markRes.status}`);
        }
      } catch (err) {
        console.error("[AutoAnnouncer] Failed to mark as played:", err);
      }

      setTotalPlayed((prev) => prev + 1);
      console.log(`[AutoAnnouncer] 📢 ═════════ DONE. Total played: ${totalPlayed + 1} ═════════`);
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
        console.log("[AutoAnnouncer] ⏳ Audio LOCKED. Showing activation button. Waiting for user click on kiosk page...");
        console.log("[AutoAnnouncer] ⏳ The polling will NOT start until audio is unlocked.");
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

        if (items.length === 0) {
          // Silent — no pending announcements (don't spam logs)
        } else {
          console.log(`[AutoAnnouncer] 📬 Poll: ${items.length} pending announcement(s)`);
          items.forEach((item, idx) => {
            console.log(`  [${idx}] id=${item.id.substring(0, 8)}... title="${item.title}" priority=${item.priority}`);
          });

          const first = items[0];
          if (first) {
            await processAnnouncement(first);
          }
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
