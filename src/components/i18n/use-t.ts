'use client'

import { useCallback } from 'react'
import { useI18nStore } from '@/lib/i18n-store'
import type { Locale } from '@/lib/i18n-messages'

/**
 * Convenience hook for consuming translations.
 *
 * Usage:
 *   const { t, locale, setLocale } = useT()
 *   <p>{t('display.departures')}</p>
 *   <p>{t('display.inMin', { min: 5 })}</p>
 */
export function useT() {
  const locale = useI18nStore((s) => s.locale)
  const tFn = useI18nStore((s) => s.t)
  const setLocale = useI18nStore((s) => s.setLocale)

  // Wrap tFn with useCallback keyed on locale so consumers
  // get a new identity when the language changes.
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => tFn(key, params),
    [locale, tFn]
  )

  return {
    t,
    locale,
    setLocale: setLocale as (l: string) => void,
  }
}
