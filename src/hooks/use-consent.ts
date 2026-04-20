'use client'

import { useCallback, useSyncExternalStore } from 'react'

export interface ConsentData {
  essential: boolean
  analytics: boolean
  marketing: boolean
  timestamp: string
}

const STORAGE_KEY = 'cookie-consent'

const defaultConsent: ConsentData = {
  essential: true,
  analytics: true,
  marketing: false,
  timestamp: '',
}

// External store helpers for useSyncExternalStore
let listeners: (() => void)[] = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(callback: () => void) {
  listeners.push(callback)
  // Also listen for storage events from other tabs
  window.addEventListener('storage', callback)
  return () => {
    listeners = listeners.filter((l) => l !== callback)
    window.removeEventListener('storage', callback)
  }
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function getServerSnapshot(): null {
  return null
}

function writeConsentToStorage(consent: ConsentData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
    emitChange()
  } catch {
    // Storage full or unavailable — ignore
  }
}

export function useConsent() {
  const rawConsent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const consent: ConsentData = rawConsent
    ? (JSON.parse(rawConsent) as ConsentData)
    : defaultConsent

  const hasConsented = rawConsent !== null

  const saveConsent = useCallback((newConsent: ConsentData) => {
    const withTimestamp: ConsentData = {
      ...newConsent,
      timestamp: new Date().toISOString(),
    }
    writeConsentToStorage(withTimestamp)
  }, [])

  const acceptAll = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: '',
    })
  }, [saveConsent])

  const reject = useCallback(() => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: '',
    })
  }, [saveConsent])

  return {
    consent,
    hasConsented,
    isLoaded: true,
    saveConsent,
    acceptAll,
    reject,
  }
}
