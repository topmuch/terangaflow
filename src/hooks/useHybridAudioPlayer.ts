"use client";

import { useState, useCallback, useRef } from "react";

export type AudioSegment =
  | { type: "mp3"; src: string }
  | { type: "tts"; text: string; lang?: string }
  | { type: "ding-dong" };

// ─── Web Audio Ding-Dong Generator ─────────────────────────────────────────────

function playDingDong(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ACtor2 = window.AudioContext || (window as any).webkitAudioContext;
      if (!ACtor2) { resolve(); return; }
      const ctx = new ACtor2();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.value = 0.35;

      // First "ding" - higher pitch (A5 = 880 Hz)
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 880;
      osc1.connect(gainNode);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Second "dong" - lower pitch (E5 = 660 Hz)
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 660;
      osc2.connect(gainNode);
      osc2.start(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.9);

      // Fade out
      gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
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

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useHybridAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const initializedRef = useRef(false);

  /** Initialise l'audio (doit être appelé suite à une interaction utilisateur) */
  const initializeAudio = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    audioRef.current = new Audio();
    synthRef.current = window.speechSynthesis;
    // Also unlock Web Audio API
    try {
      const ACtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ACtor) return;
      const ctx = new ACtor();
      if (ctx.state === "suspended") ctx.resume();
      ctx.close();
    } catch {
      // ignore
    }
  }, []);

  /** Joue une séquence audio (MP3 + TTS + ding-dong) enchaînée */
  const playSequence = useCallback(async (sequence: AudioSegment[]) => {
    // Auto-initialize if not done yet
    if (!audioRef.current) {
      audioRef.current = new Audio();
      initializedRef.current = true;
    }
    if (!synthRef.current) {
      synthRef.current = window.speechSynthesis;
    }

    setIsPlaying(true);
    synthRef.current.cancel();

    for (const segment of sequence) {
      setCurrentMessage(
        segment.type === "tts" ? segment.text : segment.type === "ding-dong" ? "Ding-dong..." : "Lecture audio..."
      );

      if (segment.type === "ding-dong") {
        // Use Web Audio API oscillator for ding-dong
        await playDingDong();
      } else if (segment.type === "mp3") {
        // For ding-dong MP3 files, use Web Audio API instead (placeholder files are silent)
        if (segment.src.includes("ding-dong")) {
          await playDingDong();
        } else {
          await new Promise<void>((resolve) => {
            if (!audioRef.current) return resolve();
            audioRef.current.src = segment.src;
            audioRef.current.onended = () => resolve();
            audioRef.current.onerror = () => {
              console.error(`Erreur chargement audio: ${segment.src}`);
              resolve();
            };
            audioRef.current.play().catch((e) => {
              console.error("Lecture audio bloquée par le navigateur", e);
              resolve();
            });
          });
        }
      } else if (segment.type === "tts") {
        await new Promise<void>((resolve) => {
          if (!synthRef.current) return resolve();
          const utterance = new SpeechSynthesisUtterance(segment.text);
          utterance.lang = segment.lang || "fr-FR";
          utterance.rate = 0.9;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          synthRef.current.speak(utterance);
        });
      }

      // Pause de 0.5s entre chaque segment pour un rendu naturel
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsPlaying(false);
    setCurrentMessage("");
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setCurrentMessage("");
  }, []);

  return { isPlaying, currentMessage, initializeAudio, playSequence, stop };
}
