/**
 * Plan Features — TerangaFlow billing plan definitions
 *
 * Defines the 4 plans (free, starter, pro, enterprise) with their
 * feature sets, limits, and Stripe price IDs (FCFA monthly pricing).
 */

export type PlanType = "free" | "starter" | "pro" | "enterprise";

export interface PlanDefinition {
  name: string;
  price: number;
  currency: string;
  features: string[];
  highlighted?: boolean;
}

export interface PlanLimits {
  maxStations: number;
  maxTripsPerDay: number;
}

// ─── Feature flags ──────────────────────────────────────────────────────────────
// Each feature is a string key used to gate functionality.

const FEATURES = {
  basicDisplay: "Affichage basique",
  kioskMode: "Mode kiosque plein écran",
  analyticsBasic: "Statistiques de base",
  analyticsFull: "Statistiques avancées",
  customDomain: "Nom de domaine personnalisé",
  whiteLabel: "Marque blanche (logo, couleurs)",
  adEngine: "Moteur publicitaire",
  apiAccess: "Accès API",
  prioritySupport: "Support prioritaire",
  unlimitedStations: "Gares illimitées",
  unlimitedTrips: "Trajets illimités",
  pushNotifications: "Notifications push voyageurs",
  merchantLanding: "Pages partenaires QR",
  pwa: "Application voyageur PWA",
  voiceAnnouncements: "Annonces vocales",
  csvImport: "Import CSV de trajets",
} as const;

export { FEATURES };

// ─── Plan definitions ──────────────────────────────────────────────────────────

export const PLANS: Record<PlanType, PlanDefinition> = {
  free: {
    name: "Gratuit",
    price: 0,
    currency: "XOF",
    features: [
      FEATURES.basicDisplay,
      FEATURES.pushNotifications,
      FEATURES.merchantLanding,
      FEATURES.pwa,
      FEATURES.voiceAnnouncements,
      FEATURES.csvImport,
    ],
  },
  starter: {
    name: "Starter",
    price: 4900,
    currency: "XOF",
    features: [
      FEATURES.basicDisplay,
      FEATURES.kioskMode,
      FEATURES.analyticsBasic,
      FEATURES.pushNotifications,
      FEATURES.merchantLanding,
      FEATURES.pwa,
      FEATURES.voiceAnnouncements,
      FEATURES.csvImport,
    ],
  },
  pro: {
    name: "Pro",
    price: 14900,
    currency: "XOF",
    features: [
      FEATURES.basicDisplay,
      FEATURES.kioskMode,
      FEATURES.analyticsFull,
      FEATURES.customDomain,
      FEATURES.whiteLabel,
      FEATURES.adEngine,
      FEATURES.pushNotifications,
      FEATURES.merchantLanding,
      FEATURES.pwa,
      FEATURES.voiceAnnouncements,
      FEATURES.csvImport,
    ],
    highlighted: true,
  },
  enterprise: {
    name: "Entreprise",
    price: 49900,
    currency: "XOF",
    features: [
      FEATURES.basicDisplay,
      FEATURES.kioskMode,
      FEATURES.analyticsFull,
      FEATURES.customDomain,
      FEATURES.whiteLabel,
      FEATURES.adEngine,
      FEATURES.apiAccess,
      FEATURES.prioritySupport,
      FEATURES.unlimitedStations,
      FEATURES.unlimitedTrips,
      FEATURES.pushNotifications,
      FEATURES.merchantLanding,
      FEATURES.pwa,
      FEATURES.voiceAnnouncements,
      FEATURES.csvImport,
    ],
  },
};

// ─── Stripe Price IDs (placeholders for dev) ────────────────────────────────────

export const PLAN_PRICES: Record<PlanType, string> = {
  free: "price_free",
  starter: "price_starter_4900",
  pro: "price_pro_14900",
  enterprise: "price_enterprise_49900",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Check whether a given plan includes a specific feature.
 */
export function hasFeature(plan: PlanType, feature: string): boolean {
  return PLANS[plan]?.features.includes(feature) ?? false;
}

/**
 * Get resource limits for a plan.
 * enterprise returns Infinity for unlimited resources.
 */
export function getPlanLimits(plan: PlanType): PlanLimits {
  switch (plan) {
    case "free":
      return { maxStations: 1, maxTripsPerDay: 5 };
    case "starter":
      return { maxStations: 3, maxTripsPerDay: 50 };
    case "pro":
      return { maxStations: 10, maxTripsPerDay: Infinity };
    case "enterprise":
      return { maxStations: Infinity, maxTripsPerDay: Infinity };
  }
}

/**
 * Ordered list of plans from lowest to highest tier (for upgrade validation).
 */
export const PLAN_HIERARCHY: PlanType[] = [
  "free",
  "starter",
  "pro",
  "enterprise",
];

/**
 * Check whether `targetPlan` is a valid upgrade from `currentPlan`.
 * Downgrades are also allowed (returns true for any different plan).
 * Returns false only if target === current.
 */
export function canChangePlan(currentPlan: PlanType, targetPlan: PlanType): boolean {
  return currentPlan !== targetPlan;
}

/**
 * Check whether `targetPlan` is a higher tier than `currentPlan`.
 */
export function isUpgrade(currentPlan: PlanType, targetPlan: PlanType): boolean {
  return PLAN_HIERARCHY.indexOf(targetPlan) > PLAN_HIERARCHY.indexOf(currentPlan);
}
