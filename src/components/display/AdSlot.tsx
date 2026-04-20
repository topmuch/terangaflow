'use client'

import { cn } from '@/lib/utils'

interface AdSlotProps {
  className?: string
  variant?: 'banner' | 'sidebar' | 'footer'
}

export function AdSlot({ className, variant = 'banner' }: AdSlotProps) {
  const ads = [
    {
      title: 'Bienvenue en Casamance',
      subtitle: 'Destination Ziguinchor',
      color: 'from-emerald-600/20 to-teal-600/20',
      border: 'border-emerald-500/20',
      emoji: '🌴',
    },
    {
      title: 'Offre Spéciale Week-end',
      subtitle: '-15% sur toutes les lignes',
      color: 'from-amber-600/20 to-orange-600/20',
      border: 'border-amber-500/20',
      emoji: '🎯',
    },
    {
      title: 'Transport Thèrmes',
      subtitle: 'Confort & Ponctualité',
      color: 'from-sky-600/20 to-cyan-600/20',
      border: 'border-sky-500/20',
      emoji: '🚌',
    },
  ]

  const currentAd = ads[Math.floor(Date.now() / 30000) % ads.length]

  if (variant === 'sidebar') {
    return (
      <div
        className={cn(
          'rounded-lg border bg-gradient-to-br p-4 flex flex-col items-center justify-center text-center gap-2',
          currentAd.color,
          currentAd.border,
          className
        )}
        role="complementary"
        aria-label="Espace publicitaire"
      >
        <span className="text-3xl" aria-hidden="true">{currentAd.emoji}</span>
        <span className="text-sm font-bold">{currentAd.title}</span>
        <span className="text-xs text-muted-foreground">{currentAd.subtitle}</span>
        <span className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-wider">Publicité</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-gradient-to-r p-3 md:p-4 flex items-center gap-4',
        currentAd.color,
        currentAd.border,
        className
      )}
      role="complementary"
      aria-label="Espace publicitaire"
    >
      <span className="text-3xl md:text-4xl shrink-0" aria-hidden="true">{currentAd.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm md:text-base truncate">{currentAd.title}</p>
        <p className="text-xs md:text-sm text-muted-foreground truncate">{currentAd.subtitle}</p>
      </div>
      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider shrink-0 hidden md:block">Publicité</span>
    </div>
  )
}
