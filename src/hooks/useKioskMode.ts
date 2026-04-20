'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface KioskOptions {
  autoFullscreen?: boolean;
  hideCursor?: boolean;
  preventSleep?: boolean;
  blockShortcuts?: boolean;
}

interface KioskState {
  isEnabled: boolean;
  isFullscreen: boolean;
  cursorHidden: boolean;
  wakeLockActive: boolean;
}

export function useKioskMode({ autoFullscreen = true, hideCursor = true, preventSleep = true, blockShortcuts = false }: KioskOptions = {}) {
  const [state, setState] = useState<KioskState>({
    isEnabled: false,
    isFullscreen: false,
    cursorHidden: false,
    wakeLockActive: false,
  });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const enable = useCallback(async () => {
    setState(prev => ({ ...prev, isEnabled: true }));

    // Fullscreen
    if (autoFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch { /* ignored */ }
    }

    // Hide cursor
    if (hideCursor) {
      document.body.classList.add('kiosk-cursor-hidden');
      setState(prev => ({ ...prev, cursorHidden: true }));
    }

    // Wake lock
    if (preventSleep && 'wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          setState(prev => ({ ...prev, wakeLockActive: false }));
        });
        setState(prev => ({ ...prev, wakeLockActive: true }));
      } catch { /* ignored */ }
    }

    // Block keyboard shortcuts
    if (blockShortcuts) {
      document.body.classList.add('kiosk-mode');
    }
  }, [autoFullscreen, hideCursor, preventSleep, blockShortcuts]);

  const disable = useCallback(async () => {
    setState(prev => ({ ...prev, isEnabled: false }));

    // Exit fullscreen
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* ignored */ }
    }

    // Show cursor
    document.body.classList.remove('kiosk-cursor-hidden');
    setState(prev => ({ ...prev, cursorHidden: false }));

    // Release wake lock
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch { /* ignored */ }
      wakeLockRef.current = null;
    }

    document.body.classList.remove('kiosk-mode');
  }, []);

  const toggle = useCallback(() => {
    if (state.isEnabled) disable();
    else enable();
  }, [state.isEnabled, enable, disable]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Re-acquire wake lock on visibility change
  useEffect(() => {
    if (!preventSleep) return;
    const handler = async () => {
      if (document.visibilityState === 'visible' && state.isEnabled && 'wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          wakeLockRef.current = lock;
          setState(prev => ({ ...prev, wakeLockActive: true }));
        } catch { /* ignored */ }
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [preventSleep, state.isEnabled]);

  // Prevent zoom on touch
  useEffect(() => {
    if (!state.isEnabled) return;
    const preventZoom = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener('touchmove', preventZoom, { passive: false });
    return () => document.removeEventListener('touchmove', preventZoom);
  }, [state.isEnabled]);

  // Block keyboard shortcuts when enabled
  useEffect(() => {
    if (!blockShortcuts || !state.isEnabled) return;
    const handler = (e: KeyboardEvent) => {
      if (['F11', 'F12', 'KeyR', 'KeyQ'].includes(e.code) && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
      }
      if (e.code === 'Escape' && document.fullscreenElement) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [blockShortcuts, state.isEnabled]);

  return { ...state, enable, disable, toggle };
}
