"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Plays a two-tone "ding-dong" chime using the Web Audio API OscillatorNode. */
function playDingDong(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const ctx = new AudioContext();

    // ── helper: schedule a single tone ──────────────────────────────────
    const scheduleTone = (
      frequency: number,
      startTime: number,
      duration: number,
      attackMs: number,
      releaseMs: number,
    ) => {
      const oscillator: OscillatorNode = ctx.createOscillator();
      const gainNode: GainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);

      // envelope: attack → sustain → release
      const attackTime = startTime + attackMs / 1000;
      const releaseStart = startTime + duration - releaseMs / 1000;
      const endTime = startTime + duration;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(1, attackTime);
      gainNode.gain.setValueAtTime(1, releaseStart);
      gainNode.gain.linearRampToValueAtTime(0, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    };

    // ── tone 1: "ding" ─────────────────────────────────────────────────
    const dingStart = ctx.currentTime;
    scheduleTone(880, dingStart, 0.3, 10, 200);

    // ── tone 2: "dong" ─────────────────────────────────────────────────
    const dongStart = dingStart + 0.35; // small gap after ding
    scheduleTone(660, dongStart, 0.4, 10, 200);

    // resolve once both tones have finished
    const totalDuration = dongStart + 0.4 + 0.05 - ctx.currentTime;
    setTimeout(() => {
      ctx.close();
      resolve();
    }, totalDuration * 1000);
  });
}

/** Speaks a single text string and resolves when done. */
function synthesizeSpeech(text: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const synth = window.speechSynthesis;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.9;
    utterance.volume = 1.0;

    utterance.onend = () => resolve();
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => reject(event);

    synth.speak(utterance);
  });
}

// ── return type ───────────────────────────────────────────────────────────
interface UseVoiceSpeakerReturn {
  isSpeaking: boolean;
  queueLength: number;
  speak: (text: string) => void;
  stop: () => void;
}

// ── hook ──────────────────────────────────────────────────────────────────
export function useVoiceSpeaker(): UseVoiceSpeakerReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  // We store the queue in a ref so the async processor always reads the
  // latest value without causing extra re-renders.
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  // ── queue processor ───────────────────────────────────────────────────
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const text = queueRef.current.shift() ?? "";

      setIsSpeaking(true);
      setQueueLength(queueRef.current.length);

      try {
        await playDingDong();
        await synthesizeSpeech(text);
      } catch {
        // If either the chime or speech fails we continue with the next item.
      }
    }

    setIsSpeaking(false);
    setQueueLength(0);
    processingRef.current = false;
  }, []);

  // ── public API ────────────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return;
      queueRef.current.push(text);
      setQueueLength(queueRef.current.length);

      // Kick off the processor if it isn't already running.
      if (!processingRef.current) {
        void processQueue();
      }
    },
    [processQueue],
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    processingRef.current = false;
    setIsSpeaking(false);
    setQueueLength(0);
  }, []);

  // ── cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isSpeaking, queueLength, speak, stop };
}
