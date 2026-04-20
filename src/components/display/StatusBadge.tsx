'use client'

import { cn } from '@/lib/utils'
import { Bus, Train, Ship, Clock, CheckCircle2, AlertTriangle, XCircle, DoorOpen } from 'lucide-react'

type ScheduleStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'DELAYED' | 'CANCELLED'

interface StatusBadgeProps {
  status: ScheduleStatus
  delayMinutes?: number
  className?: string
}

const statusConfig: Record<ScheduleStatus, {
  label: string
  icon: React.ElementType
  bgColor: string
  textColor: string
  pulse?: boolean
}> = {
  SCHEDULED: {
    label: 'Prévu',
    icon: Clock,
    bgColor: 'bg-sky-500/15',
    textColor: 'text-sky-400',
  },
  BOARDING: {
    label: 'Embarquement',
    icon: DoorOpen,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    pulse: true,
  },
  DEPARTED: {
    label: 'Parti',
    icon: CheckCircle2,
    bgColor: 'bg-zinc-500/15',
    textColor: 'text-zinc-500',
  },
  DELAYED: {
    label: 'Retardé',
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    pulse: true,
  },
  CANCELLED: {
    label: 'Annulé',
    icon: XCircle,
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
  },
}

export function StatusBadge({ status, delayMinutes, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.SCHEDULED
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider',
        config.bgColor,
        config.textColor,
        className
      )}
      role="status"
      aria-label={delayMinutes ? `${config.label} - retard de ${delayMinutes} minutes` : config.label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
      {delayMinutes && delayMinutes > 0 && status === 'DELAYED' && (
        <span className="font-mono font-bold">+{delayMinutes}min</span>
      )}
    </span>
  )
}

// --- LINE BADGE ---

interface LineBadgeProps {
  code: string
  color: string
  type: string
  className?: string
}

const typeIcons: Record<string, React.ElementType> = {
  BUS: Bus,
  TRAIN: Train,
  FERRY: Ship,
  TAXI: Clock,
}

export function LineBadge({ code, color, type, className }: LineBadgeProps) {
  const Icon = typeIcons[type] || Bus

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-sm uppercase tracking-wide',
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <Icon className="w-4 h-4" />
      <span className="font-mono">{code}</span>
    </span>
  )
}

// --- TIME DISPLAY ---

interface TimeDisplayProps {
  time: string
  adjustedTime?: string
  delayMinutes?: number
  isUrgent?: boolean
  minutesUntil?: number
}

export function TimeDisplay({ time, adjustedTime, delayMinutes, isUrgent, minutesUntil }: TimeDisplayProps) {
  const displayTime = delayMinutes && delayMinutes > 0 && adjustedTime ? adjustedTime : time

  let timeLabel: string | null = null
  if (minutesUntil !== undefined && minutesUntil >= 0 && minutesUntil <= 60) {
    if (minutesUntil === 0) {
      timeLabel = 'Maintenant'
    } else if (minutesUntil === 1) {
      timeLabel = 'Dans 1 min'
    } else {
      timeLabel = `Dans ${minutesUntil} min`
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={cn(
          'font-mono text-2xl lg:text-3xl font-bold tabular-nums',
          isUrgent && 'text-emerald-400 animate-pulse'
        )}
      >
        {displayTime}
      </span>
      {timeLabel && (
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            isUrgent ? 'text-emerald-400' : 'text-muted-foreground'
          )}
        >
          {timeLabel}
        </span>
      )}
      {delayMinutes && delayMinutes > 0 && (
        <span className="text-xs text-amber-400 font-mono line-through opacity-50">
          {time}
        </span>
      )}
    </div>
  )
}
