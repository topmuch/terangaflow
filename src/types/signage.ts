// ─── Trip Status ──────────────────────────────────────────────────────────────────

export const TRIP_STATUS = {
  SCHEDULED: "SCHEDULED",
  BOARDING: "BOARDING",
  DELAYED: "DELAYED",
  DEPARTURE_IMMINENT: "DEPARTURE_IMMINENT",
  ARRIVAL_IMMINENT: "ARRIVAL_IMMINENT",
  DEPARTED: "DEPARTED",
  CANCELLED: "CANCELLED",
  ARRIVED: "ARRIVED",
} as const;

export type TripStatus = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];

// ─── Trip Status Display Config ──────────────────────────────────────────────────

interface TripStatusConfig {
  label: string;
  color: string;          // Tailwind text class
  bgColor: string;        // Tailwind bg class
  priority: number;       // Higher = more important (for sorting)
}

export const TRIP_STATUS_CONFIG: Record<TripStatus, TripStatusConfig> = {
  SCHEDULED: {
    label: "À l'heure",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
    priority: 0,
  },
  BOARDING: {
    label: "Embarquement",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    priority: 1,
  },
  DELAYED: {
    label: "Retard",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-500/20",
    priority: 2,
  },
  DEPARTURE_IMMINENT: {
    label: "Départ imminent",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-500/20",
    priority: 3,
  },
  ARRIVAL_IMMINENT: {
    label: "Arrivée imminente",
    color: "text-cyan-700 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-500/20",
    priority: 3,
  },
  DEPARTED: {
    label: "Parti",
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-500/20",
    priority: 3,
  },
  CANCELLED: {
    label: "Annulé",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-500/20",
    priority: 4,
  },
  ARRIVED: {
    label: "Arrivé",
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-500/20",
    priority: 5,
  },
};

// ─── API Response Types ──────────────────────────────────────────────────────────

export interface DepartureItem {
  id: string;
  destination: string;
  operatorName: string;
  departureTime: string;        // ISO 8601
  estimatedArrival: string;     // ISO 8601
  status: TripStatus;
  platform: string | null;
  lineCode: string;
  lineName: string;
  notes: string | null;
  minutesUntilDeparture: number;
}

export interface StationInfo {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  timezone: string;
}

export interface MerchantItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  whatsapp: string | null;
  mapsUrl: string | null;
  promoText: string | null;
}

export interface DeparturesResponse {
  station: StationInfo;
  departures: DepartureItem[];
  merchants: MerchantItem[];
  updatedAt: string;
  tickerMessages: TickerMessage[];
}

export interface TickerMessage {
  id: string;
  text: string;
  type: "info" | "urgent" | "ad";
  displayOrder: number;
}
