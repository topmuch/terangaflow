"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Megaphone } from "lucide-react";
import type { SlotType } from "@/lib/adEngine";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdCreativeData {
  id: string;
  campaignId: string;
  campaignName: string;
  advertiserName: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaText: string;
  trackingToken: string;
}

interface AdSlotProps {
  stationId: string;
  slotType: SlotType;
  /** Rotation interval in ms (default 30000 = 30s) */
  intervalMs?: number;
  /** Layout variant for the slot */
  variant?: "banner" | "card" | "compact" | "footer";
  /** CSS class to apply to the outer wrapper */
  className?: string;
  /** Respect prefers-reduced-motion */
  reducedMotion?: boolean;
}

// ─── Session ID (persistent per browser tab) ──────────────────────────────────

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("tf_ad_sid");
  if (!sid) {
    sid = `tf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("tf_ad_sid", sid);
  }
  return sid;
}

// ─── Fallback ad (TerangaFlow branding) ───────────────────────────────────────

const FALLBACK_AD: AdCreativeData = {
  id: "fallback",
  campaignId: "terangaflow-internal",
  campaignName: "TerangaFlow",
  advertiserName: "TerangaFlow",
  title: "TerangaFlow",
  body: "L'intelligence des gares — Gérez vos départs en temps réel",
  imageUrl: null,
  linkUrl: null,
  ctaText: "En savoir plus",
  trackingToken: "",
};

// ─── sendBeacon helper ────────────────────────────────────────────────────────

function trackEvent(
  trackingToken: string,
  type: "impression" | "click"
) {
  if (!trackingToken) return;
  try {
    const payload = JSON.stringify({ token: trackingToken, type });
    // Use sendBeacon for non-blocking tracking
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/ads/track", blob);
    } else {
      // Fallback to fetch with keepalive
      fetch("/api/ads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Silently fail — tracking should never block
      });
    }
  } catch {
    // Silently fail
  }
}

// ─── Reduced motion detection (SSR-safe via useSyncExternalStore) ──────────────

function useReducedMotion(): boolean {
  function subscribe(callback: () => void): () => void {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", callback);
    return () => mq.removeEventListener("change", callback);
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdSlot({
  stationId,
  slotType,
  intervalMs = 30000,
  variant = "banner",
  className = "",
}: AdSlotProps) {
  const reducedMotion = useReducedMotion();
  const [ad, setAd] = useState<AdCreativeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const sessionIdRef = useRef("");
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Initialize session ID once
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  // Fetch ad
  const fetchAd = useCallback(async () => {
    try {
      const sid = sessionIdRef.current;
      const params = new URLSearchParams({
        stationId,
        slot: slotType,
        ...(sid ? { sessionId: sid } : {}),
      });

      const res = await fetch(`/api/ads?${params.toString()}`);
      const data = await res.json();

      if (data.ad && !data.fallback) {
        setAd(data.ad);
        setImpressionTracked(false); // Reset tracking flag for new ad
      } else {
        // No eligible ads — show fallback
        setAd(FALLBACK_AD);
        setImpressionTracked(true); // Don't track fallback impressions
      }
    } catch {
      // Error fetching — show fallback
      setAd(FALLBACK_AD);
      setImpressionTracked(true);
    } finally {
      setLoading(false);
    }
  }, [stationId, slotType]);

  // Initial fetch + auto-rotation
  useEffect(() => {
    fetchAd();

    // Set up rotation timer
    if (intervalMs > 0) {
      rotationTimerRef.current = setInterval(fetchAd, intervalMs);
    }

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, [fetchAd, intervalMs]);

  // Track impression when ad becomes visible
  useEffect(() => {
    if (ad && ad.id !== "fallback" && !impressionTracked) {
      trackEvent(ad.trackingToken, "impression");
      setImpressionTracked(true);
    }
  }, [ad, impressionTracked]);

  // Handle click — track + open link
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (ad && ad.id !== "fallback" && ad.linkUrl) {
        trackEvent(ad.trackingToken, "click");
        // Open in new tab
        window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
        e.preventDefault();
      }
    },
    [ad]
  );

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading || !ad) {
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`}
        role="complementary"
        aria-label="Espace publicitaire"
      >
        <div className="h-full flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Megaphone className="h-4 w-4" />
            <span className="text-xs">Chargement…</span>
          </div>
        </div>
      </div>
    );
  }

  const isFallback = ad.id === "fallback";
  const shouldAnimate = !reducedMotion;

  // ─── Banner variant (header slot) ────────────────────────────────────────
  if (variant === "banner") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={ad.id}
          initial={shouldAnimate ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          exit={shouldAnimate ? { opacity: 0 } : undefined}
          transition={{ duration: shouldAnimate ? 0.5 : 0 }}
          className={`relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 ${className}`}
          role="complementary"
          aria-label="Publicité"
        >
          <div className="flex items-center gap-3 px-4 py-2">
            {/* Ad content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white truncate">{ad.title}</p>
                {!isFallback && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    Sponsorisé
                  </span>
                )}
              </div>
              {ad.body && (
                <p className="text-[11px] text-gray-300 truncate">{ad.body}</p>
              )}
            </div>

            {/* CTA */}
            {ad.linkUrl && (
              <button
                onClick={handleClick}
                className="shrink-0 flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
                aria-label={ad.ctaText}
              >
                <span className="hidden sm:inline">{ad.ctaText}</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* TerangaFlow branding for fallback */}
          {isFallback && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-50">
              <Megaphone className="h-3.5 w-3.5 text-amber-500" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Card variant (insert slot) ──────────────────────────────────────────
  if (variant === "card") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={ad.id}
          initial={shouldAnimate ? { opacity: 0, scale: 0.96 } : undefined}
          animate={{ opacity: 1, scale: 1 }}
          exit={shouldAnimate ? { opacity: 0, scale: 0.96 } : undefined}
          transition={{ duration: shouldAnimate ? 0.4 : 0 }}
          className={`relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
          role="complementary"
          aria-label="Publicité"
        >
          {/* Image section */}
          {ad.imageUrl ? (
            <div className="relative aspect-[3/1] bg-gray-100 dark:bg-gray-800">
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="h-full w-full object-cover"
              />
              {!isFallback && (
                <span className="absolute top-2 left-2 inline-flex items-center rounded-full bg-black/60 text-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  Sponsorisé
                </span>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {ad.title}
                    </p>
                    {!isFallback && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Sponsorisé
                      </span>
                    )}
                  </div>
                  {ad.advertiserName && ad.id !== "fallback" && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      par {ad.advertiserName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Body + CTA */}
          <div className="px-4 py-3">
            {ad.body && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {ad.body}
              </p>
            )}
            {ad.linkUrl && (
              <button
                onClick={handleClick}
                className="w-full flex items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
                aria-label={ad.ctaText}
              >
                {ad.ctaText}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Compact variant (sidebar) ─────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={ad.id}
          initial={shouldAnimate ? { opacity: 0, x: 10 } : undefined}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldAnimate ? { opacity: 0, x: -10 } : undefined}
          transition={{ duration: shouldAnimate ? 0.3 : 0 }}
          className={`relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800/50 border ${className}`}
          role="complementary"
          aria-label="Publicité"
        >
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              {!isFallback && (
                <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                  Sponsorisé
                </span>
              )}
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate flex-1">
                {ad.title}
              </p>
            </div>
            {ad.body && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1.5">
                {ad.body}
              </p>
            )}
            {ad.linkUrl && (
              <button
                onClick={handleClick}
                className="w-full flex items-center justify-center gap-1 rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-black hover:bg-amber-400 transition-colors"
                aria-label={ad.ctaText}
              >
                {ad.ctaText}
                <ExternalLink className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Footer variant ──────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={ad.id}
        initial={shouldAnimate ? { opacity: 0 } : undefined}
        animate={{ opacity: 1 }}
        exit={shouldAnimate ? { opacity: 0 } : undefined}
        transition={{ duration: shouldAnimate ? 0.5 : 0 }}
        className={`relative flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white ${className}`}
        role="complementary"
        aria-label="Publicité"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {!isFallback && (
            <span className="shrink-0 inline-flex items-center rounded-full bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
              Sponsorisé
            </span>
          )}
          <p className="text-xs font-medium truncate">{ad.title}</p>
          {ad.body && (
            <p className="text-[11px] text-gray-400 truncate hidden sm:block">
              — {ad.body}
            </p>
          )}
        </div>
        {ad.linkUrl && (
          <button
            onClick={handleClick}
            className="shrink-0 ml-2 flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
            aria-label={ad.ctaText}
          >
            <span className="text-[10px] font-bold">{ad.ctaText}</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
