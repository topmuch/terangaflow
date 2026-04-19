'use client'

import { useState, useCallback } from 'react'

// ============================================================
// Types
// ============================================================

export type PushStatus = 'pending' | 'granted' | 'denied' | 'subscribed' | 'error'

interface UsePushSubscriptionReturn {
  status: PushStatus
  subscribe: () => Promise<void>
}

// ============================================================
// Helpers
// ============================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// ============================================================
// Hook
// ============================================================

export function usePushSubscription(
  stationId: string,
  lineIds?: string[]
): UsePushSubscriptionReturn {
  const [status, setStatus] = useState<PushStatus>('pending')

  const subscribe = useCallback(async () => {
    try {
      // Check if browser supports push notifications
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('error')
        return
      }

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return
      }
      if (permission !== 'granted') {
        setStatus('error')
        return
      }

      setStatus('granted')

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')

      // Get VAPID key from env
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
      if (!vapidKey) {
        console.error('[usePushSubscription] NEXT_PUBLIC_VAPID_KEY is not set')
        setStatus('error')
        return
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey)

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      // Extract keys from subscription
      const p256dh = arrayBufferToBase64(subscription.getKey('p256dh')!)
      const authKey = arrayBufferToBase64(subscription.getKey('auth')!)

      // Post subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId,
          lineIds: lineIds ?? [],
          subscription: {
            endpoint: subscription.endpoint,
            p256dh,
            authKey,
          },
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to save subscription')
      }

      setStatus('subscribed')
    } catch (err) {
      console.error('[usePushSubscription] Error:', err)
      setStatus('error')
    }
  }, [stationId, lineIds])

  return { status, subscribe }
}
