import { create } from 'zustand'
import { messages, type Locale } from './i18n-messages'

// ============================================================
// i18n Zustand Store
// ============================================================
// Simple client-side i18n for single-page app.
// Persists locale preference to localStorage.

const STORAGE_KEY = 'smartticketqr-locale'

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'fr'

  // 1. Check localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr' || stored === 'en' || stored === 'wo') return stored
  } catch {
    // Ignore storage errors (e.g. SSR, incognito)
  }

  // 2. Check navigator.language
  const lang = navigator.language?.toLowerCase() ?? ''
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('en')) return 'en'
  // Senegal — Wolof is widely spoken but rarely set as browser locale.
  // Fallback to French as the default for the region.
  return 'fr'
}

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

export const useI18nStore = create<I18nState>((set, get) => ({
  locale: getInitialLocale(),

  setLocale: (locale: Locale) => {
    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Ignore
    }

    // Update document lang attribute for accessibility
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }

    set({ locale })
  },

  t: (key: string, params?: Record<string, string | number>): string => {
    const { locale } = get()
    const value = messages[locale]?.[key] ?? messages.fr?.[key] ?? key

    // Interpolate parameters like {min}, {count}, {name}, etc.
    if (!params) return value

    return value.replace(/\{(\w+)\}/g, (_match, paramKey: string) => {
      const replacement = params[paramKey]
      return replacement !== undefined ? String(replacement) : _match
    })
  },
}))
