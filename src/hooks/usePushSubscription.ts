'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

interface UsePushSubscriptionOptions {
  stationId: string
  lineIds?: string[]
  onSubscribed?: () => void
  onUnsubscribed?: () => void
}

interface UsePushSubscriptionReturn {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  permission: NotificationPermission | 'default'
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  requestPermission: () => Promise<boolean>
}

// ============================================================
// Helpers
// ============================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// ============================================================
// Hook
// ============================================================

export function usePushSubscription({
  stationId,
  lineIds = [],
  onSubscribed,
  onUnsubscribed,
}: UsePushSubscriptionOptions): UsePushSubscriptionReturn {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default')

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  // Check current subscription status on mount
  useEffect(() => {
    if (!isSupported) return

    // Check notification permission
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }

    // Check existing push subscription
    let mounted = true
    navigator.serviceWorker.ready.then(async (registration) => {
      if (!mounted) return
      const sub = await registration.pushManager.getSubscription()
      if (mounted) setIsSubscribed(!!sub)
    })

    return () => {
      mounted = false
    }
  }, [isSupported])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || typeof Notification === 'undefined') {
      toast.error('Les notifications push ne sont pas supportees par ce navigateur')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }, [isSupported])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error('Les notifications push ne sont pas supportees')
      return
    }

    setIsLoading(true)
    try {
      // Request permission first
      const granted = await requestPermission()
      if (!granted) {
        toast.warning('Permission de notification refusee')
        return
      }

      // Get VAPID public key from env
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
      if (!vapidKey) {
        toast.error('Service de notifications non configure')
        return
      }

      // Register service worker and subscribe
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Extract subscription details
      const subJson = subscription.toJSON()
      const payload = {
        stationId,
        lineIds,
        subscription: {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh ?? '',
          authKey: subJson.keys?.auth ?? '',
        },
      }

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Echec de l\'abonnement')

      setIsSubscribed(true)
      toast.success('Abonnement aux notifications active !')
      onSubscribed?.()
    } catch (err) {
      const error = err as Error
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, stationId, lineIds, requestPermission, onSubscribed])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return

    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
      toast.success('Abonnement aux notifications desactive')
      onUnsubscribed?.()
    } catch (err) {
      const error = err as Error
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, onUnsubscribed])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
  }
}
