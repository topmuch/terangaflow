'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { AlertTriangle, Info, Megaphone } from 'lucide-react'

interface TickerMessage {
  id: string
  content: string
  type: string
  priority: number
}

interface TickerBarProps {
  stationId: string
  speed?: number // pixels per second
  className?: string
}

export function TickerBar({ stationId, speed = 80, className = '' }: TickerBarProps) {
  const [messages, setMessages] = useState<TickerMessage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [animationDuration, setAnimationDuration] = useState(15)

  useEffect(() => {
    let cancelled = false

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/ticker?stationId=${stationId}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success && !cancelled) {
            setMessages(json.data)
          }
        }
      } catch {
        // Silently fail - ticker is non-critical
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 30000) // Refresh every 30s
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [stationId])

  // Calculate animation duration based on content width
  useEffect(() => {
    if (contentRef.current && containerRef.current) {
      const contentWidth = contentRef.current.scrollWidth
      const containerWidth = containerRef.current.clientWidth
      if (contentWidth > containerWidth) {
        setAnimationDuration((contentWidth + containerWidth) / speed)
      }
    }
  }, [messages, currentIndex, speed])

  // Cycle through messages
  useEffect(() => {
    if (messages.length <= 1) return
    const cycleDuration = (animationDuration + 2) * 1000
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
    }, cycleDuration)
    return () => clearInterval(interval)
  }, [messages.length, animationDuration])

  const getIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
      case 'URGENT':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      case 'AD':
        return <Megaphone className="w-4 h-4 text-emerald-400 shrink-0" />
      default:
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />
    }
  }

  const getBackground = (type: string) => {
    switch (type) {
      case 'ALERT':
      case 'URGENT':
        return 'bg-amber-950/80 border-amber-500/30'
      case 'AD':
        return 'bg-emerald-950/80 border-emerald-500/30'
      default:
        return 'bg-card border-border'
    }
  }

  if (messages.length === 0) {
    return null
  }

  const currentMessage = messages[currentIndex] || messages[0]

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden w-full ${className}`}
      role="marquee"
      aria-label={currentMessage.content}
    >
      <div
        className={`${getBackground(currentMessage.type)} border-t border-b py-2 px-4 flex items-center gap-3`}
      >
        <span className="shrink-0">{getIcon(currentMessage.type)}</span>
        <div className="overflow-hidden flex-1 relative h-6">
          <div
            ref={contentRef}
            className="whitespace-nowrap inline-block text-sm font-medium"
            style={{
              animation: `ticker-scroll ${animationDuration}s linear infinite`,
            }}
          >
            <span className="px-8">{currentMessage.content}</span>
            {/* Duplicate for seamless loop */}
            <span className="px-8">{currentMessage.content}</span>
          </div>
        </div>
        {messages.length > 1 && (
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {currentIndex + 1}/{messages.length}
          </span>
        )}
      </div>
    </div>
  )
}
