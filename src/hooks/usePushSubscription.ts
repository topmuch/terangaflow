"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UsePushSubscriptionReturn extends PushSubscriptionState {
  subscribe: (stationId?: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
  resetError: () => void;
}

// ─── VAPID Public Key (base64url-encoded) ─────────────────────────────────────
// In production, this comes from env: NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// ─── Helper: Convert base64url to Uint8Array ─────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePushSubscription(): UsePushSubscriptionReturn {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    permission: "default",
    isSubscribed: false,
    isLoading: false,
    error: null,
  });

  // Check browser support on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setState((prev) => ({
      ...prev,
      isSupported: supported,
      permission: supported
        ? Notification.permission
        : "denied",
    }));

    if (supported) {
      checkExistingSubscription();
    }
  }, []);

  // Listen for permission changes
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const handler = () => {
      setState((prev) => ({
        ...prev,
        permission: Notification.permission,
      }));
    };

    // Use permission query change event
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "notifications" })
        .then((result) => {
          result.addEventListener("change", handler);
        })
        .catch(() => {
          // Fallback: poll permission
        });
    }

    return () => {};
  }, []);

  // Check existing subscription
  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState((prev) => ({
        ...prev,
        isSubscribed: !!subscription,
      }));
    } catch {
      // Service worker not ready yet
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(
    async (stationId?: string) => {
      if (!state.isSupported) {
        setState((prev) => ({
          ...prev,
          error: "Les notifications push ne sont pas supportées par votre navigateur.",
        }));
        return;
      }

      if (!VAPID_PUBLIC_KEY) {
        setState((prev) => ({
          ...prev,
          error:
            "Clé VAPID non configurée. Contactez l'administrateur.",
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // 1. Request notification permission
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            permission,
            error:
              permission === "denied"
                ? "Les notifications sont bloquées. Vérifiez les paramètres de votre navigateur."
                : "Vous avez refusé les notifications.",
          }));
          return;
        }

        // 2. Register service worker if needed
        const registration = await navigator.serviceWorker.ready;

        // 3. Create push subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });

        // 4. Send subscription to server
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(
                String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh") as ArrayBuffer))
              ),
              auth: btoa(
                String.fromCharCode(...new Uint8Array(subscription.getKey("auth") as ArrayBuffer))
              ),
            },
            stationId: stationId || null,
            userAgent: navigator.userAgent,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Erreur lors de l'enregistrement de l'abonnement."
          );
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSubscribed: true,
          permission: "granted",
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "Une erreur inattendue s'est produite.",
        }));
      }
    },
    [state.isSupported]
  );

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from server
        try {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        } catch {
          // Server removal failed — continue with client unsubscribe
        }

        // Remove from browser
        await subscription.unsubscribe();
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSubscribed: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : "Erreur lors du désabonnement.",
      }));
    }
  }, []);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    resetError,
  };
}
