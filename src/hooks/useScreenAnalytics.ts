'use client';

import { useEffect } from 'react';

/**
 * Hook to track screen analytics for kiosk displays.
 * Sends impression pings every 60s and tracks visibility changes.
 */
export function useScreenAnalytics(stationId: string) {
  useEffect(() => {
    if (!stationId) return;

    // 1. Track an "Impression" every 60 seconds if the screen is visible
    const trackImpression = () => {
      if (document.visibilityState === 'visible') {
        navigator.sendBeacon(
          '/api/analytics/track',
          JSON.stringify({
            stationId,
            eventType: 'impression',
            focusZone: 'main_screen',
            timestamp: new Date().toISOString(),
          })
        );
      }
    };

    const interval = setInterval(trackImpression, 60000);
    trackImpression(); // Immediate track on mount

    // 2. Track visibility changes (screen on/off)
    const handleVisibilityChange = () => {
      navigator.sendBeacon(
        '/api/analytics/track',
        JSON.stringify({
          stationId,
          eventType:
            document.visibilityState === 'visible' ? 'screen_on' : 'screen_off',
          timestamp: new Date().toISOString(),
        })
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stationId]);
}
