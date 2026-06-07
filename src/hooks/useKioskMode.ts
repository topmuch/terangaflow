"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface KioskModeState {
  isKiosk: boolean;
  isFullscreen: boolean;
  wakeLockActive: boolean;
  toggleFullscreen: () => Promise<void>;
  enterKiosk: () => Promise<void>;
  exitKiosk: () => Promise<void>;
}

/**
 * Kiosk mode hook: manages fullscreen, wake lock, and cursor hiding.
 * Designed for digital signage displays in stations.
 */
export function useKioskMode(): KioskModeState {
  const [isKiosk, setIsKiosk] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ─── Request Wake Lock ───────────────────────────────────────────────────
  const requestWakeLock = useCallback(async () => {
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        setWakeLockActive(true);

        wakeLockRef.current.addEventListener("release", () => {
          setWakeLockActive(false);
        });
      } catch {
        // Wake lock request failed (e.g., battery saver mode)
        setWakeLockActive(false);
      }
    }
  }, []);

  // ─── Release Wake Lock ──────────────────────────────────────────────────
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch {
        // ignore release errors
      }
    }
    setWakeLockActive(false);
  }, []);

  // ─── Fullscreen toggle ───────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen request denied
    }
  }, []);

  // ─── Enter kiosk mode ────────────────────────────────────────────────────
  const enterKiosk = useCallback(async () => {
    setIsKiosk(true);
    await requestWakeLock();
    if (!document.fullscreenElement) {
      await toggleFullscreen();
    }
  }, [requestWakeLock, toggleFullscreen]);

  // ─── Exit kiosk mode ─────────────────────────────────────────────────────
  const exitKiosk = useCallback(async () => {
    setIsKiosk(false);
    await releaseWakeLock();
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setIsFullscreen(false);
  }, [releaseWakeLock]);

  // ─── Listen for fullscreen changes (user press ESC) ──────────────────────
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && isKiosk) {
        setIsKiosk(false);
        releaseWakeLock();
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isKiosk, releaseWakeLock]);

  // ─── Re-acquire wake lock on visibility change (tab comes back to focus) ─
  useEffect(() => {
    if (!isKiosk) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isKiosk, requestWakeLock]);

  // ─── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isKiosk,
    isFullscreen,
    wakeLockActive,
    toggleFullscreen,
    enterKiosk,
    exitKiosk,
  };
}
