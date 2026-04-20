'use client';

import { useEffect } from 'react';

/**
 * Hook to track screen analytics for kiosk displays.
 * Sends impression pings every 60s and tracks visibility changes.
 * Uses Blob with correct Content-Type for sendBeacon.
 */
function trackEvent(stationId: string, eventType: string, focusZone?: string) {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;

  const payload = JSON.stringify({
    stationId,
    eventType,
    focusZone: focusZone || null,
    timestamp: new Date().toISOString(),
  });

  // Use Blob with application/json Content-Type so server can parse body
  const blob = new Blob([payload], { type: 'application/json' });
  navigator.sendBeacon('/api/analytics/track', blob);
}

export function useScreenAnalytics(stationId: string) {
  useEffect(() => {
    if (!stationId) return;

    // 1. Track an "Impression" every 60 seconds if the screen is visible
    const trackImpression = () => {
      if (document.visibilityState === 'visible') {
        trackEvent(stationId, 'impression', 'main_screen');
      }
    };

    const interval = setInterval(trackImpression, 60000);
    trackImpression(); // Immediate track on mount

    // 2. Track visibility changes (screen on/off)
    const handleVisibilityChange = () => {
      trackEvent(
        stationId,
        document.visibilityState === 'visible' ? 'screen_on' : 'screen_off'
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stationId]);
}
