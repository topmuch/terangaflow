'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Hook to detect PWA install capability and manage the install prompt.
 *
 * - `canInstall`: Whether the browser supports installing the PWA and the
 *   `beforeinstallprompt` event has been captured.
 * - `isInstalled`: Whether the app is already running in standalone mode.
 * - `promptInstall()`: Triggers the native install dialog. Returns the user's
 *   choice (`'accepted'` or `'dismissed'`).
 */
export function usePwa() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check if the app is already running as a standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // Also check iOS Safari standalone mode
    if ((window.navigator as unknown as { standalone: boolean }).standalone === true) return true;
    return false;
  });

  useEffect(() => {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleStandaloneChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    standaloneQuery.addEventListener('change', handleStandaloneChange);

    // Capture the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener('change', handleStandaloneChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
    if (!deferredPrompt) return null;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setCanInstall(false);
      }

      return choiceResult.outcome;
    } catch {
      return null;
    }
  }, [deferredPrompt]);

  return {
    canInstall,
    isInstalled,
    promptInstall,
  };
}
