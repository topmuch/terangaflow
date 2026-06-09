"use client";

// ─── Audio Engine Autonome ─────────────────────────────────────────────────────────
//
// Moteur audio complet sans aucun fichier MP3.
//   - Ding-Dong synthétisé via Web Audio API (2 tons : 880Hz → 660Hz)
//   - TTS via window.speechSynthesis (fr-FR, vitesse posée style gare SNCF)
//   - File d'attente séquentielle pour éviter les chevauchements
//
// Utilisé par le composant AutoAnnouncer côté client.
// ─────────────────────────────────────────────────────────────────────────────────

// ─── Ding-Dong Synthétisé ─────────────────────────────────────────────────────────

export function playDingDong(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ACtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ACtor) {
        resolve();
        return;
      }

      const ctx = new ACtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";

      // Séquence Ding (aigu 880Hz) → Dong (grave 660Hz)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.9);
      osc.onended = () => {
        ctx.close();
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

// ─── TTS (Text-to-Speech) ──────────────────────────────────────────────────────────

export function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.92; // Vitesse posée, style gare SNCF
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Ne jamais bloquer la file
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

// ─── Séquence principale : Ding-Dong + Texte ──────────────────────────────────────

export async function playAnnouncement(text: string): Promise<void> {
  await playDingDong();
  await new Promise((res) => setTimeout(res, 600)); // Pause naturelle après le Ding-Dong
  await speakText(text);
}
