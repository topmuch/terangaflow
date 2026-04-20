// ============================================================
// White Label Theme Presets
// ============================================================
// Predefined theme configurations for different stations/tenants.
// Each preset includes branding, colors, and display preferences.

export interface WhiteLabelTheme {
  tenantId: string
  appName: string           // e.g., "Gare de Dakar"
  tagline: string           // e.g., "Votre gare, votre voyage"
  primaryColor: string      // hex, e.g., "#e11d48" (rose)
  accentColor: string       // hex, e.g., "#f59e0b" (amber)
  logoUrl?: string          // URL to custom logo
  favicon?: string          // URL to custom favicon
  hideBranding: boolean     // hide "SmartTicketQR" watermark
  customCss?: string        // additional CSS
}

// --- Default SmartTicketQR Theme ---
export const defaultTheme: WhiteLabelTheme = {
  tenantId: 'default',
  appName: 'SmartTicketQR',
  tagline: 'Votre billet intelligent, en un clin d\'œil',
  primaryColor: '#10b981',
  accentColor: '#14b8a6',
  hideBranding: false,
}

// --- Preset Themes ---
export interface ThemePreset {
  id: string
  name: string
  description: string
  theme: WhiteLabelTheme
  previewGradient: string  // For preset selector buttons
}

export const themePresets: ThemePreset[] = [
  {
    id: 'smartticketqr',
    name: 'SmartTicketQR',
    description: 'Thème par défaut — Émeraude & Turquoise',
    theme: {
      ...defaultTheme,
    },
    previewGradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'dakar',
    name: 'Gare de Dakar',
    description: 'Rose & Rouge — Gare principale de Dakar',
    theme: {
      tenantId: 'dakar',
      appName: 'Gare de Dakar',
      tagline: 'Votre gare, votre voyage',
      primaryColor: '#e11d48',
      accentColor: '#f59e0b',
      hideBranding: true,
    },
    previewGradient: 'from-rose-500 to-red-500',
  },
  {
    id: 'saint-louis',
    name: 'Saint-Louis Express',
    description: 'Ciel & Bleu — Express Saint-Louis',
    theme: {
      tenantId: 'saint-louis',
      appName: 'Saint-Louis Express',
      tagline: 'Relier le nord, en toute sérénité',
      primaryColor: '#0ea5e9',
      accentColor: '#6366f1',
      hideBranding: true,
    },
    previewGradient: 'from-sky-500 to-blue-500',
  },
  {
    id: 'maritime',
    name: 'Gare Maritime',
    description: 'Cyan & Turquoise — Transports maritimes',
    theme: {
      tenantId: 'maritime',
      appName: 'Gare Maritime',
      tagline: 'Voyager sur l\'eau, sereinement',
      primaryColor: '#06b6d4',
      accentColor: '#14b8a6',
      hideBranding: true,
    },
    previewGradient: 'from-cyan-500 to-teal-500',
  },
]

/**
 * Get a preset theme by its ID.
 * Returns undefined if no matching preset is found.
 */
export function getPresetById(id: string): WhiteLabelTheme | undefined {
  return themePresets.find((p) => p.id === id)?.theme
}

/**
 * Get a preset object (with metadata) by its ID.
 */
export function getPresetObjectById(id: string): ThemePreset | undefined {
  return themePresets.find((p) => p.id === id)
}
