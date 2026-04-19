'use client'

import { useI18nStore } from '@/lib/i18n-store'
import { localeFlags, type Locale } from '@/lib/i18n-messages'
import { motion } from 'framer-motion'

const locales: Locale[] = ['fr', 'en', 'wo']

export function LanguageSwitcher() {
  const locale = useI18nStore((s) => s.locale)
  const setLocale = useI18nStore((s) => s.setLocale)

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
      {locales.map((loc) => {
        const isActive = locale === loc
        return (
          <motion.button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative flex items-center gap-1 rounded-md px-2 py-1.5
              text-xs font-medium transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-emerald-500 focus-visible:ring-offset-1
              focus-visible:ring-offset-background
              ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              }
            `}
            aria-label={`Switch to ${loc.toUpperCase()}`}
            aria-pressed={isActive}
          >
            {/* Active background indicator */}
            {isActive && (
              <motion.span
                layoutId="lang-active-bg"
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 text-sm leading-none">
              {localeFlags[loc]}
            </span>
            <span className="relative z-10 hidden sm:inline uppercase tracking-wider">
              {loc}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
