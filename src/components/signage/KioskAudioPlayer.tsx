"use client";

import { useEffect, useRef } from "react";
import { useKioskAudioReceiver } from "@/hooks/useAudioBroadcast";
import type { AudioBroadcastEvent } from "@/hooks/useAudioBroadcast";

// ─── Web Audio Ding-Dong ───────────────────────────────────────────────────────

function playDingDong(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new AudioContext();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.value = 0.35;

      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 880;
      osc1.connect(gainNode);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 660;
      osc2.connect(gainNode);
      osc2.start(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.9);

      gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);

      osc1.onended = () => {
        osc2.onended = () => {
          ctx.close();
          resolve();
        };
      };
    } catch {
      resolve();
    }
  });
}

// ─── TTS Helper ───────────────────────────────────────────────────────────────

function speak(text: string, lang = "fr-FR"): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
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

// ─── Play a full audio sequence received from WebSocket ───────────────────────

async function playAudioSequence(event: AudioBroadcastEvent): Promise<void> {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }

  for (const segment of event.segments) {
    if (segment.type === "ding-dong") {
      // Use Web Audio API oscillator for ding-dong
      await playDingDong();
      await new Promise((r) => setTimeout(r, 500));
    } else if (segment.type === "mp3") {
      // Replace ding-dong MP3 with Web Audio API for reliability
      if (segment.src.includes("ding-dong")) {
        await playDingDong();
        await new Promise((r) => setTimeout(r, 500));
      } else {
        // Try to play the MP3 file
        try {
          await new Promise<void>((resolve) => {
            const audio = new Audio(segment.src);
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
          await new Promise((r) => setTimeout(r, 500));
        } catch {
          // Skip if audio fails
        }
      }
    } else if (segment.type === "tts") {
      await speak(segment.text, segment.lang);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface KioskAudioPlayerProps {
  stationId: string | undefined;
}

export function KioskAudioPlayer({ stationId }: KioskAudioPlayerProps) {
  const { isConnected, lastEvent, clearEvent } = useKioskAudioReceiver(stationId);
  const playingRef = useRef(false);

  // Initialize audio context on first interaction
  useEffect(() => {
    const init = () => {
      try {
        const ctx = new AudioContext();
        if (ctx.state === "suspended") ctx.resume();
        ctx.close();
      } catch {
        // ignore
      }
    };
    document.addEventListener("click", init, { once: true });
    document.addEventListener("touchstart", init, { once: true });
    document.addEventListener("keydown", init, { once: true });
    return () => {
      document.removeEventListener("click", init);
      document.removeEventListener("touchstart", init);
      document.removeEventListener("keydown", init);
    };
  }, []);

  // Play received audio events
  useEffect(() => {
    if (!lastEvent || playingRef.current) return;

    playingRef.current = true;
    playAudioSequence(lastEvent).finally(() => {
      playingRef.current = false;
      clearEvent();
    });
  }, [lastEvent, clearEvent]);

  return null; // Invisible component — audio plays in background
}
