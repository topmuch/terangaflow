// ─── Trip State Machine ─────────────────────────────────────────────────────────
//
// Strict state graph for trip lifecycle management.
// All transitions must be validated before applying to the database.
// Terminal states: CANCELLED, ARRIVED (no transitions out).
//

import { TRIP_STATUS, type TripStatus } from "@/types/signage";

// ─── Transition Edge ────────────────────────────────────────────────────────────

export interface TransitionEdge {
  from: TripStatus;
  to: TripStatus;
  label: string;        // Human-readable French label
  requiresReason: boolean;
}

// ─── Strict Transition Graph ────────────────────────────────────────────────────
// Only transitions listed here are valid. Everything else is blocked.

export const TRANSITION_GRAPH: readonly TransitionEdge[] = [
  // From SCHEDULED
  { from: "SCHEDULED",  to: "BOARDING",            label: "Début d'embarquement", requiresReason: false },
  { from: "SCHEDULED",  to: "ARRIVAL_IMMINENT",    label: "Arrivée imminente", requiresReason: false },
  { from: "SCHEDULED",  to: "DELAYED",             label: "Retard signalé", requiresReason: true },
  { from: "SCHEDULED",  to: "CANCELLED",           label: "Annulation", requiresReason: true },

  // From BOARDING
  { from: "BOARDING",   to: "DEPARTURE_IMMINENT",  label: "Départ imminent", requiresReason: false },
  { from: "BOARDING",   to: "DEPARTED",            label: "Départ effectif", requiresReason: false },
  { from: "BOARDING",   to: "DELAYED",             label: "Retard durant embarquement", requiresReason: true },
  { from: "BOARDING",   to: "CANCELLED",           label: "Annulation", requiresReason: true },

  // From DELAYED
  { from: "DELAYED",    to: "BOARDING",            label: "Reprise embarquement", requiresReason: false },
  { from: "DELAYED",    to: "CANCELLED",           label: "Annulation après retard", requiresReason: true },

  // From DEPARTURE_IMMINENT
  { from: "DEPARTURE_IMMINENT", to: "DEPARTED",    label: "Départ effectif", requiresReason: false },
  { from: "DEPARTURE_IMMINENT", to: "CANCELLED",   label: "Annulation", requiresReason: true },

  // From ARRIVAL_IMMINENT
  { from: "ARRIVAL_IMMINENT", to: "ARRIVED",        label: "Arrivée effective", requiresReason: false },
  { from: "ARRIVAL_IMMINENT", to: "CANCELLED",      label: "Annulation", requiresReason: true },

  // From DEPARTED
  { from: "DEPARTED",   to: "ARRIVED",             label: "Arrivée à destination", requiresReason: false },
];

// ─── Build adjacency map for O(1) lookup ────────────────────────────────────────

type TransitionKey = `${string}|${string}`;
const _validTransitions = new Set<TransitionKey>();

for (const edge of TRANSITION_GRAPH) {
  _validTransitions.add(`${edge.from}|${edge.to}`);
}

// ─── State Machine API ──────────────────────────────────────────────────────────

export interface TransitionResult {
  valid: boolean;
  error: string | null;
  edge: TransitionEdge | null;
}

/**
 * Validate whether a transition from `from` to `to` is permitted.
 * Returns a TransitionResult with the matching edge or an error message.
 */
export function validateTransition(
  from: string,
  to: string
): TransitionResult {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  // Check if from/to are valid statuses
  const validStatuses = Object.values(TRIP_STATUS) as readonly string[];
  if (!validStatuses.includes(fromUpper)) {
    return { valid: false, error: `Statut source invalide: "${from}"`, edge: null };
  }
  if (!validStatuses.includes(toUpper)) {
    return { valid: false, error: `Statut cible invalide: "${to}"`, edge: null };
  }

  // Same-state transition is never valid
  if (fromUpper === toUpper) {
    return {
      valid: false,
      error: `Transition identique interdite: "${fromUpper}" → "${toUpper}"`,
      edge: null,
    };
  }

  const key: TransitionKey = `${fromUpper}|${toUpper}`;
  const edge = TRANSITION_GRAPH.find(
    (e) => e.from === fromUpper && e.to === toUpper
  );

  if (!edge) {
    return {
      valid: false,
      error: `Transition interdite: "${fromUpper}" → "${toUpper}"`,
      edge: null,
    };
  }

  return { valid: true, error: null, edge };
}

/**
 * Get all valid target states from a given state.
 */
export function getAvailableTransitions(from: string): TransitionEdge[] {
  const fromUpper = from.toUpperCase();
  return TRANSITION_GRAPH.filter((e) => e.from === fromUpper);
}

/**
 * Check if a state is terminal (no transitions out).
 */
export function isTerminalState(status: string): boolean {
  const upper = status.toUpperCase();
  return (
    upper === TRIP_STATUS.CANCELLED ||
    upper === TRIP_STATUS.ARRIVED
  );
}

/**
 * Render a template string with trip context variables.
 * Supported variables: {destination}, {platform}, {delay}, {operator}, {lineCode}
 */
export function renderTemplate(
  template: string,
  context: Record<string, string | number | null | undefined>
): string {
  let result = template;

  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{${key}}`;
    const replacement = value != null ? String(value) : "N/A";
    result = result.replaceAll(placeholder, replacement);
  }

  return result;
}
