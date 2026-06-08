"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DepartureTrip {
  id: string;
  lineName: string;
  operatorName: string;
  departureTime: string; // ISO string
  platform: string | null;
  status: string;
}

export interface DepartureAlert {
  id: string;
  tripId: string;
  destination: string;
  platform: string | null;
  operatorName: string;
  departureTime: string; // ISO string
  triggeredAt: string; // ISO string
  type: "departure" | "imminent"; // imminent = 5min warning
}

export interface UpcomingDeparture {
  trip: DepartureTrip;
  minutesRemaining: number;
  isImminent: boolean; // <= 5 min
  isNow: boolean; // <= 1 min
}

// ─── Web Audio Ding-Dong Generator ───────────────────────────────────────────

function createDingDong(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new AudioContext();
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.value = 0.3;

      // First "ding" - higher pitch
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 880; // A5
      osc1.connect(gainNode);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Second "dong" - lower pitch
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 660; // E5
      osc2.connect(gainNode);
      osc2.start(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.9);

      // Fade out
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
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

// ─── TTS Helper ───────────────────────────────────────────────────────────────

function speak(text: string, lang = "fr-FR"): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
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

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useDepartureNotifier(stationId: string | undefined) {
  const [upcomingDepartures, setUpcomingDepartures] = useState<UpcomingDeparture[]>(
    []
  );
  const [alerts, setAlerts] = useState<DepartureAlert[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(true);

  const notifiedTripsRef = useRef<Set<string>>(new Set());
  const imminentNotifiedRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Enable audio on first user interaction ────────────────────────────────
  useEffect(() => {
    const handleInteraction = () => {
      setIsAudioEnabled(true);
      // Init AudioContext
      try {
        const ctx = new AudioContext();
        ctx.close();
      } catch {
        // ignore
      }
    };
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  // ─── Fetch trips and compute upcoming departures ──────────────────────────
  const fetchAndCheck = useCallback(async () => {
    if (!stationId || !isMonitoring) return;

    try {
      const res = await fetch(`/api/station/${stationId}/trips`);
      if (!res.ok) return;
      const trips: DepartureTrip[] = await res.json();

      const now = new Date();
      const upcoming: UpcomingDeparture[] = [];

      for (const trip of trips) {
        if (trip.status === "DEPARTED" || trip.status === "CANCELLED") continue;

        const departure = new Date(trip.departureTime);
        const diffMs = departure.getTime() - now.getTime();
        const diffMin = Math.floor(diffMs / 60_000);

        // Only show departures within the next 2 hours
        if (diffMin >= 0 && diffMin <= 120) {
          upcoming.push({
            trip,
            minutesRemaining: diffMin,
            isImminent: diffMin <= 5 && diffMin > 0,
            isNow: diffMin <= 0, // within the current minute
          });

          // Trigger departure alert when it's THE time (within 1 minute)
          if (diffMin <= 0 && !notifiedTripsRef.current.has(trip.id)) {
            notifiedTripsRef.current.add(trip.id);

            const alert: DepartureAlert = {
              id: crypto.randomUUID(),
              tripId: trip.id,
              destination: trip.lineName,
              platform: trip.platform,
              operatorName: trip.operatorName,
              departureTime: trip.departureTime,
              triggeredAt: new Date().toISOString(),
              type: "departure",
            };

            setAlerts((prev) => [alert, ...prev].slice(0, 20));

            // Play ding-dong + TTS announcement
            if (isAudioEnabled) {
              playDepartureAlert(trip);
            }
          }

          // Trigger imminent warning at 5 minutes
          if (diffMin <= 5 && diffMin > 0 && !imminentNotifiedRef.current.has(trip.id)) {
            imminentNotifiedRef.current.add(trip.id);

            const alert: DepartureAlert = {
              id: crypto.randomUUID(),
              tripId: trip.id,
              destination: trip.lineName,
              platform: trip.platform,
              operatorName: trip.operatorName,
              departureTime: trip.departureTime,
              triggeredAt: new Date().toISOString(),
              type: "imminent",
            };

            setAlerts((prev) => [alert, ...prev].slice(0, 20));

            // Play imminent warning
            if (isAudioEnabled) {
              playImminentAlert(trip);
            }
          }
        }
      }

      // Sort by departure time (closest first)
      upcoming.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
      setUpcomingDepartures(upcoming);
    } catch {
      // Silently fail — polling will retry
    }
  }, [stationId, isMonitoring, isAudioEnabled]);

  // ─── Play departure alert (ding-dong + TTS) ───────────────────────────────
  const playDepartureAlert = useCallback(async (trip: DepartureTrip) => {
    setIsAlerting(true);
    const platformText = trip.platform ? `au quai ${trip.platform}` : "";
    const operatorText = trip.operatorName ? `, ${trip.operatorName}` : "";

    try {
      // 1. Ding-dong sound
      await createDingDong();
      await new Promise((r) => setTimeout(r, 600));

      // 2. TTS: "Attention, le départ pour {destination} {platform} est maintenant."
      await speak(
        `Attention. Le départ pour ${trip.lineName} ${platformText} est maintenant.${operatorText}. Merci de monter à bord.`
      );
    } catch {
      // Silently fail
    } finally {
      setIsAlerting(false);
    }
  }, []);

  // ─── Play imminent alert (shorter) ────────────────────────────────────────
  const playImminentAlert = useCallback(async (trip: DepartureTrip) => {
    setIsAlerting(true);
    const platformText = trip.platform ? `au quai ${trip.platform}` : "";

    try {
      // 1. Short ding-dong
      await createDingDong();
      await new Promise((r) => setTimeout(r, 400));

      // 2. TTS: "Le départ pour {destination} {platform} est dans 5 minutes."
      await speak(
        `Le départ pour ${trip.lineName} ${platformText} est dans cinq minutes.`
      );
    } catch {
      // Silently fail
    } finally {
      setIsAlerting(false);
    }
  }, []);

  // ─── Manual trigger for testing ──────────────────────────────────────────
  const manualTriggerAlert = useCallback(
    async (trip: DepartureTrip) => {
      notifiedTripsRef.current.add(trip.id);
      const alert: DepartureAlert = {
        id: crypto.randomUUID(),
        tripId: trip.id,
        destination: trip.lineName,
        platform: trip.platform,
        operatorName: trip.operatorName,
        departureTime: trip.departureTime,
        triggeredAt: new Date().toISOString(),
        type: "departure",
      };
      setAlerts((prev) => [alert, ...prev].slice(0, 20));
      if (isAudioEnabled) {
        await playDepartureAlert(trip);
      }
    },
    [isAudioEnabled, playDepartureAlert]
  );

  // ─── Stop current alert ───────────────────────────────────────────────────
  const stopAlert = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    setIsAlerting(false);
  }, []);

  // ─── Dismiss alert ───────────────────────────────────────────────────────
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // ─── Clear all alerts ─────────────────────────────────────────────────────
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // ─── Polling effect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!stationId) return;

    // Initial fetch
    fetchAndCheck();

    // Poll every 30 seconds
    pollingRef.current = setInterval(fetchAndCheck, 30_000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [stationId, fetchAndCheck]);

  return {
    upcomingDepartures,
    alerts,
    isAlerting,
    isAudioEnabled,
    isMonitoring,
    setIsMonitoring,
    manualTriggerAlert,
    stopAlert,
    dismissAlert,
    clearAlerts,
  };
}
