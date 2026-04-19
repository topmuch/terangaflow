'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface KioskModeState {
  isEnabled: boolean
  isFullscreen: boolean
  wakeLockSupported: boolean
  wakeLockActive: boolean
}

interface UseKioskModeOptions {
  /** Auto-enable kiosk mode on mount */
  autoEnable?: boolean
  /** Block keyboard shortcuts (F5, Ctrl+R, etc.) */
  blockShortcuts?: boolean
  /** Prevent pinch-to-zoom on touch devices */
  preventZoom?: boolean
  /** Disable right-click context menu */
  disableContextMenu?: boolean
}

export function useKioskMode(options: UseKioskModeOptions = {}) {
  const {
    autoEnable = false,
    blockShortcuts = true,
    preventZoom = true,
    disableContextMenu = true,
  } = options

  const [state, setState] = useState<KioskModeState>({
    isEnabled: false,
    isFullscreen: false,
    wakeLockSupported: false,
    wakeLockActive: false,
  })

  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  // --- Fullscreen Management ---
  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if ((el as unknown as { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen) {
        await (el as unknown as { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen()
      } else if ((el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen) {
        await (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
      }
      setState((prev) => ({ ...prev, isFullscreen: true }))
    } catch (err) {
      console.warn('[Kiosk] Fullscreen request failed:', err)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      setState((prev) => ({ ...prev, isFullscreen: false }))
    } catch (err) {
      console.warn('[Kiosk] Exit fullscreen failed:', err)
    }
  }, [])

  // --- Wake Lock (Screen Stay Awake) ---
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      setState((prev) => ({ ...prev, wakeLockSupported: true }))
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        setState((prev) => ({ ...prev, wakeLockActive: true }))

        // Re-acquire wake lock when page becomes visible again
        wakeLockRef.current.addEventListener('release', () => {
          setState((prev) => ({ ...prev, wakeLockActive: false }))
        })
      } catch (err) {
        console.warn('[Kiosk] Wake lock request failed:', err)
      }
    }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        setState((prev) => ({ ...prev, wakeLockActive: false }))
      } catch (err) {
        console.warn('[Kiosk] Wake lock release failed:', err)
      }
    }
  }, [])

  // --- Enable Kiosk Mode ---
  const enable = useCallback(async () => {
    await enterFullscreen()
    await requestWakeLock()
    setState((prev) => ({ ...prev, isEnabled: true }))
  }, [enterFullscreen, requestWakeLock])

  // --- Disable Kiosk Mode ---
  const disable = useCallback(async () => {
    await exitFullscreen()
    await releaseWakeLock()
    setState((prev) => ({ ...prev, isEnabled: false }))
  }, [exitFullscreen, releaseWakeLock])

  // --- Keyboard Shortcut Blocker ---
  useEffect(() => {
    if (!state.isEnabled || !blockShortcuts) return

    const handler = (e: KeyboardEvent) => {
      // Block F5 (refresh), Ctrl+R (refresh), Ctrl+Shift+R, Ctrl+Shift+I (devtools)
      // F11 (fullscreen toggle), Ctrl+W (close), Ctrl+L (address bar), Alt+F4
      const blocked = [
        { key: 'F5', ctrl: false, alt: false },
        { key: 'r', ctrl: true, alt: false },
        { key: 'R', ctrl: true, alt: false },
        { key: 'I', ctrl: true, shift: true },
        { key: 'i', ctrl: true, shift: true },
        { key: 'J', ctrl: true, shift: true },
        { key: 'j', ctrl: true, shift: true },
        { key: 'u', ctrl: true },
        { key: 'U', ctrl: true },
        { key: 'F11', ctrl: false, alt: false },
        { key: 'l', ctrl: true },
        { key: 'L', ctrl: true },
      ]

      for (const blockedKey of blocked) {
        if (
          e.key === blockedKey.key &&
          e.ctrlKey === blockedKey.ctrl &&
          (blockedKey.alt !== undefined ? e.altKey === blockedKey.alt : true) &&
          (!('shift' in blockedKey) || e.shiftKey === (blockedKey as { shift: boolean }).shift)
        ) {
          e.preventDefault()
          return
        }
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [state.isEnabled, blockShortcuts])

  // --- Context Menu Blocker ---
  useEffect(() => {
    if (!state.isEnabled || !disableContextMenu) return

    const handler = (e: MouseEvent) => {
      e.preventDefault()
    }

    document.addEventListener('contextmenu', handler, true)
    return () => document.removeEventListener('contextmenu', handler, true)
  }, [state.isEnabled, disableContextMenu])

  // --- Zoom Prevention ---
  useEffect(() => {
    if (!state.isEnabled || !preventZoom) return

    // Set viewport meta to prevent zoom
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    }

    // Block Ctrl+/- zoom
    const wheelHandler = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
      }
    }

    document.addEventListener('wheel', wheelHandler, { passive: false })
    return () => {
      document.removeEventListener('wheel', wheelHandler)
      // Restore viewport
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
      }
    }
  }, [state.isEnabled, preventZoom])

  // --- Listen for fullscreen changes ---
  useEffect(() => {
    const handler = () => {
      setState((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
        isEnabled: !!document.fullscreenElement && prev.isEnabled,
      }))
    }

    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // --- Re-acquire wake lock on visibility change ---
  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === 'visible' && state.isEnabled && state.wakeLockSupported) {
        await requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [state.isEnabled, state.wakeLockSupported, requestWakeLock])

  // --- Auto-enable on mount ---
  useEffect(() => {
    if (autoEnable) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        requestWakeLock()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [autoEnable, requestWakeLock])

  return {
    ...state,
    enable,
    disable,
    toggle: state.isEnabled ? disable : enable,
  }
}
