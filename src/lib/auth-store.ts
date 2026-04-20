import { create } from 'zustand'

export type UserRole = 'SUPERADMIN' | 'STATION_MANAGER' | 'TRANSPORTER' | 'MERCHANT' | 'TRAVELER'

interface Tenant {
  id: string
  name: string
  slug: string
  type: string
}

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  tenant: Tenant | null
  token: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string) => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()

      if (json.success) {
        set({
          user: json.data,
          isAuthenticated: true,
          isLoading: false,
        })
        return true
      }

      set({ isLoading: false })
      return false
    } catch {
      set({ isLoading: false })
      return false
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
  },
}))

// Role-based permission check helper
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false
  if (user.role === 'SUPERADMIN') return true

  const rolePermissions: Record<UserRole, string[]> = {
    SUPERADMIN: ['*'],
    STATION_MANAGER: [
      'stations:read', 'stations:write', 'lines:read', 'lines:write',
      'platforms:read', 'platforms:write', 'schedules:read', 'schedules:write',
      'ticker:read', 'ticker:write', 'analytics:read',
    ],
    TRANSPORTER: [
      'lines:read', 'schedules:read', 'schedules:write',
      'vehicles:read', 'vehicles:write', 'delays:report',
    ],
    MERCHANT: ['merchants:read', 'merchants:write', 'offers:read', 'offers:write'],
    TRAVELER: ['stations:read', 'departures:read', 'push:subscribe'],
  }

  const permissions = rolePermissions[user.role] || []
  return permissions.includes('*') || permissions.includes(permission)
}

// Get role label in French
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPERADMIN: 'Super Admin',
    STATION_MANAGER: 'Gestionnaire',
    TRANSPORTER: 'Transporteur',
    MERCHANT: 'Commerçant',
    TRAVELER: 'Voyageur',
  }
  return labels[role] || role
}

// Get role color
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    SUPERADMIN: 'bg-red-500/15 text-red-400 border-red-500/20',
    STATION_MANAGER: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    TRANSPORTER: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    MERCHANT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    TRAVELER: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  }
  return colors[role] || colors.TRAVELER
}
