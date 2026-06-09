"use client";

// ─── Audio Engine Premium ────────────────────────────────────────────────────────
//
// Ding-Dong Premium, chaleureux et mémorable.
//   - "Ding" : onde Triangle (carillon/marimba), 880Hz (La5)
//   - "Dong" : onde Sinus (résonnant/profond), 659Hz (Mi5)
//   - Intervalle musical : Tierce Majeure (La5 → Mi5)
//   - Zéro fichier MP3 — tout généré par Web Audio API
//
// Utilisé par le composant AutoAnnouncer côté client.
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Génère un "Ding-Dong" Premium, chaleureux et mémorable.
 * Utilise une onde Triangle (type carillon/marimba) pour le "Ding"
 * et une onde Sinus (profonde/résonnante) pour le "Dong".
 * L'intervalle musical (La5 -> Mi5) est une "Tierce Majeure",
 * universellement perçue comme agréable et rassurante.
 */
export function playPremiumDingDong(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ACtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!ACtor) {
        resolve();
        return;
      }

      const ctx = new ACtor();
      const now = ctx.currentTime;

      // --- 1. Le "DING" (Aigu, chaleureux, type carillon) ---
      const oscDing = ctx.createOscillator();
      const gainDing = ctx.createGain();

      oscDing.type = "triangle"; // Plus doux et naturel que 'sine'
      oscDing.frequency.setValueAtTime(880, now); // Note La5 (A5)

      // Enveloppe sonore : attaque douce, décroissance naturelle
      gainDing.gain.setValueAtTime(0, now);
      gainDing.gain.linearRampToValueAtTime(0.25, now + 0.05); // Attaque rapide mais pas agressive
      gainDing.gain.exponentialRampToValueAtTime(0.001, now + 0.7); // Décroissance de 0.7s

      oscDing.connect(gainDing);
      gainDing.connect(ctx.destination);
      oscDing.start(now);
      oscDing.stop(now + 0.7);

      // --- 2. Le "DONG" (Grave, résonnant, profond) ---
      const oscDong = ctx.createOscillator();
      const gainDong = ctx.createGain();

      oscDong.type = "sine"; // Onde pure pour la résonance grave
      oscDong.frequency.setValueAtTime(659.25, now + 0.15); // Note Mi5 (E5) - harmonie parfaite avec le La5

      gainDong.gain.setValueAtTime(0, now + 0.15);
      gainDong.gain.linearRampToValueAtTime(0.35, now + 0.25); // Légèrement plus puissant pour l'ancrage
      gainDong.gain.exponentialRampToValueAtTime(0.001, now + 1.5); // Résonance longue de 1.5s

      oscDong.connect(gainDong);
      gainDong.connect(ctx.destination);
      oscDong.start(now + 0.15);
      oscDong.stop(now + 1.5);

      // --- 3. Résolution ---
      // On attend que la résonance se termine avant de lancer la voix
      setTimeout(() => {
        ctx.close();
        resolve();
      }, 1600);
    } catch {
      resolve();
    }
  });
}

/**
 * Joue le texte avec une voix naturelle et posée.
 */
export function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      // Annuler toute parole en cours pour éviter les chevauchements
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.92; // Vitesse légèrement ralentie pour une diction claire de gare
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Ne jamais bloquer le système en cas d'erreur

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

/**
 * Séquence principale : Ding-Dong Premium + Pause naturelle + Texte
 */
export async function playAnnouncement(text: string): Promise<void> {
  await playPremiumDingDong();

  // Pause de 0.6 seconde entre le carillon et la voix pour un effet "respirant" et professionnel
  await new Promise((res) => setTimeout(res, 600));

  await speakText(text);
}
