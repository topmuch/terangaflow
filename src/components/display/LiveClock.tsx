'use client'

import { useEffect, useState, useCallback } from 'react'

interface LiveClockProps {
  timezone?: string
  className?: string
}

export function LiveClock({ timezone = 'Africa/Dakar', className = '' }: LiveClockProps) {
  const [time, setTime] = useState<string>('--:--:--')
  const [date, setDate] = useState<string>('')

  const updateTime = useCallback(() => {
    const now = new Date()
    // Use the provided timezone for display
    try {
      const timeStr = now.toLocaleTimeString('fr-FR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      const dateStr = now.toLocaleDateString('fr-FR', {
        timeZone: timezone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      setTime(timeStr)
      setDate(dateStr)
    } catch {
      // Fallback if timezone is invalid
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      setDate(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }
  }, [timezone])

  useEffect(() => {
    const interval = setInterval(() => updateTime(), 1000)
    return () => clearInterval(interval)
  }, [updateTime])

  return (
    <div className={`flex flex-col items-end ${className}`}>
      <time
        className="font-mono tabular-nums text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider"
        aria-label={`Heure actuelle: ${time}`}
      >
        {time}
      </time>
      <span className="text-xs md:text-sm text-muted-foreground capitalize mt-1">
        {date}
      </span>
    </div>
  )
}
