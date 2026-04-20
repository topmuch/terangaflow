// ============================================================
// White Label Theme Store (Zustand)
// ============================================================
// Manages tenant-based white label theming.
// Persists selected theme to localStorage and applies CSS variables.

import { create } from 'zustand'
import { defaultTheme, type WhiteLabelTheme } from './whitelist-presets'

const STORAGE_KEY = 'whitelabel-theme'

function loadThemeFromStorage(): WhiteLabelTheme | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as WhiteLabelTheme
    // Validate that essential fields exist
    if (parsed.tenantId && parsed.appName && parsed.primaryColor && parsed.accentColor) {
      return parsed
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function persistTheme(theme: WhiteLabelTheme | null): void {
  try {
    if (theme) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Applies a theme's colors and metadata as CSS custom properties
 * on the document root element.
 */
function applyThemeToDocument(theme: WhiteLabelTheme): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.setProperty('--wl-primary', theme.primaryColor)
  root.style.setProperty('--wl-accent', theme.accentColor)
  root.style.setProperty('--wl-app-name', `"${theme.appName}"`)
  root.style.setProperty('--wl-tagline', `"${theme.tagline}"`)
  root.style.setProperty('--wl-hide-branding', theme.hideBranding ? '1' : '0')

  if (theme.logoUrl) {
    root.style.setProperty('--wl-logo-url', `url("${theme.logoUrl}")`)
  } else {
    root.style.removeProperty('--wl-logo-url')
  }

  if (theme.customCss) {
    // Sanitize: strip any script tags or dangerous CSS expressions to prevent XSS
    const sanitizedCss = theme.customCss
      .replace(/<\/?script[^>]*>/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/url\s*\(\s*["']?\s*javascript/gi, 'url("data:text/plain,')

    // Apply custom CSS via a dynamic style tag
    let styleTag = document.getElementById('wl-custom-css') as HTMLStyleElement | null
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = 'wl-custom-css'
      document.head.appendChild(styleTag)
    }
    styleTag.textContent = sanitizedCss
  } else {
    const existing = document.getElementById('wl-custom-css')
    if (existing) existing.remove()
  }
}

/**
 * Removes all white label CSS variables from the document root.
 */
function removeThemeFromDocument(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.removeProperty('--wl-primary')
  root.style.removeProperty('--wl-accent')
  root.style.removeProperty('--wl-app-name')
  root.style.removeProperty('--wl-tagline')
  root.style.removeProperty('--wl-hide-branding')
  root.style.removeProperty('--wl-logo-url')

  const existing = document.getElementById('wl-custom-css')
  if (existing) existing.remove()
}

interface WhiteLabelState {
  theme: WhiteLabelTheme | null

  /** Set the active theme and persist to localStorage */
  setTheme: (theme: WhiteLabelTheme | null) => void

  /** Apply current theme's CSS variables to the document root */
  applyTheme: () => void

  /** Reset to default SmartTicketQR branding */
  resetTheme: () => void

  /** Load theme from localStorage on mount */
  hydrate: () => void
}

export const useWhiteLabelStore = create<WhiteLabelState>((set, get) => ({
  theme: null,

  setTheme: (theme: WhiteLabelTheme | null) => {
    persistTheme(theme)
    set({ theme })
    // Auto-apply when setting
    if (theme) {
      applyThemeToDocument(theme)
    }
  },

  applyTheme: () => {
    const { theme } = get()
    if (theme) {
      applyThemeToDocument(theme)
    }
  },

  resetTheme: () => {
    // Reset to the built-in default SmartTicketQR branding
    persistTheme(null)
    set({ theme: { ...defaultTheme } })
    applyThemeToDocument(defaultTheme)
  },

  hydrate: () => {
    const stored = loadThemeFromStorage()
    if (stored) {
      set({ theme: stored })
      applyThemeToDocument(stored)
    }
  },
}))
