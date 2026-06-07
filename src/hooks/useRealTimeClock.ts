"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface RealTimeClock {
  time: string;        // HH:MM:SS
  date: string;        // "mercredi 15 janvier 2025"
  isoString: string;   // ISO 8601
  seconds: number;
}

/**
 * Real-time clock that updates every second.
 * Uses timezone-aware formatting via Intl.DateTimeFormat.
 */
export function useRealTimeClock(timezone: string = "Africa/Dakar"): RealTimeClock {
  const [clock, setClock] = useState<RealTimeClock>(() => getClockTime(timezone));
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    setClock(getClockTime(timezone));
  }, [timezone]);

  useEffect(() => {
    // Sync to the next second boundary
    const syncToSecond = () => {
      tick();
      // Schedule next tick at the start of next second
      rafRef.current = window.requestAnimationFrame(syncToSecond);
    };

    rafRef.current = window.requestAnimationFrame(syncToSecond);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [tick]);

  return clock;
}

function getClockTime(timezone: string): RealTimeClock {
  const now = new Date();

  // Time: HH:MM:SS
  const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Date: "mercredi 15 janvier 2025"
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeStr = timeFormatter.format(now);
  const dateStr = dateFormatter.format(now);

  // Capitalize first letter of date
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return {
    time: timeStr,
    date: capitalizedDate,
    isoString: now.toISOString(),
    seconds: now.getSeconds(),
  };
}
