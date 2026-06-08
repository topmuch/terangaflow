"use client";

import { useEffect, useRef } from "react";
import { useKioskAudioReceiver } from "@/hooks/useAudioBroadcast";
import type { AudioBroadcastEvent } from "@/hooks/useAudioBroadcast";

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
    if (segment.type === "mp3") {
      await playMp3(segment.src);
      await new Promise((r) => setTimeout(r, 500));
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
        const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        audio.volume = 0;
        audio.play().catch(() => {});
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
