"use client";

import { useState, useCallback, useRef } from "react";

export type AudioSegment =
  | { type: "mp3"; src: string }
  | { type: "tts"; text: string; lang?: string };

export function useHybridAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  /** Initialise l'audio (doit être appelé suite à une interaction utilisateur) */
  const initializeAudio = useCallback(() => {
    audioRef.current = new Audio();
    synthRef.current = window.speechSynthesis;
  }, []);

  /** Joue une séquence audio (MP3 + TTS) enchaînée */
  const playSequence = useCallback(async (sequence: AudioSegment[]) => {
    if (!audioRef.current || !synthRef.current) {
      console.warn(
        "Audio non initialisé. Appelez initializeAudio() suite à un clic utilisateur."
      );
      return;
    }

    setIsPlaying(true);
    synthRef.current.cancel();

    for (const segment of sequence) {
      setCurrentMessage(
        segment.type === "tts" ? segment.text : "Lecture audio..."
      );

      if (segment.type === "mp3") {
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
