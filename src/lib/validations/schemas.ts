import { z } from "zod";

// ─── Line ──────────────────────────────────────────────────────────────────────

export const createLineSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(120, "Le nom ne peut pas dépasser 120 caractères"),
  code: z
    .string()
    .min(2, "Le code doit contenir au moins 2 caractères")
    .max(20, "Le code ne peut pas dépasser 20 caractères")
    .regex(/^[A-Z0-9\-]+$/, "Code invalide (majuscules, chiffres, tirets uniquement)"),
  isActive: z.boolean().default(true),
});

export type CreateLineInput = z.infer<typeof createLineSchema>;

// ─── Trip ──────────────────────────────────────────────────────────────────────

export const tripStatusEnum = z.enum([
  "scheduled",
  "delayed",
  "cancelled",
  "departed",
  "arrived",
  "boarding",
]);

export const createTripSchema = z.object({
  lineId: z.string().min(1, "La ligne est requise"),
  operatorName: z
    .string()
    .min(2, "Le nom de l'opérateur est requis")
    .max(100),
  departureTime: z.string().datetime("Format ISO 8601 requis"),
  estimatedArrival: z.string().datetime("Format ISO 8601 requis"),
  status: tripStatusEnum.default("scheduled"),
  platform: z.string().max(10).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

// CSV row schema for import
export const csvRowSchema = z.object({
  lineCode: z.string().min(1, "Code ligne requis"),
  operatorName: z.string().min(1, "Opérateur requis"),
  departureTime: z.string().min(1, "Heure de départ requise"),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  platform: z.string().max(10).optional().default(""),
  status: tripStatusEnum.default("scheduled"),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

// ─── Ticker Message ──────────────────────────────────────────────────────────────

export const tickerTypeEnum = z.enum(["info", "urgent", "ad"]);

export const createTickerSchema = z.object({
  text: z
    .string()
    .min(3, "Le message doit contenir au moins 3 caractères")
    .max(300, "Le message ne peut pas dépasser 300 caractères"),
  type: tickerTypeEnum.default("info"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateTickerSchema = z.object({
  text: z.string().min(3).max(300).optional(),
  type: tickerTypeEnum.optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateTickerInput = z.infer<typeof createTickerSchema>;
export type UpdateTickerInput = z.infer<typeof updateTickerSchema>;

// ─── Trip Transition ────────────────────────────────────────────────────────────

export const tripTransitionSchema = z.object({
  tripId: z.string().min(1, "L'identifiant du trajet est requis"),
  toStatus: tripStatusEnum,
  reason: z.string().max(500).optional(),
  platform: z.string().max(10).optional(),
});

export type TripTransitionInput = z.infer<typeof tripTransitionSchema>;

// ─── Notification Rule ──────────────────────────────────────────────────────────

export const channelEnum = z.enum(["voice", "display", "push", "all"]);

export const createNotificationRuleSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(120),
  triggerFrom: tripStatusEnum,
  triggerTo: tripStatusEnum,
  channel: channelEnum.default("voice"),
  template: z
    .string()
    .min(3, "Le template doit contenir au moins 3 caractères")
    .max(500),
  repeatEveryMin: z.number().int().min(0).max(60).default(0),
  repeatMaxTimes: z.number().int().min(0).max(20).default(0),
  priority: z.number().int().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});

export type CreateNotificationRuleInput = z.infer<typeof createNotificationRuleSchema>;

// ─── Merchant ───────────────────────────────────────────────────────────────────

export const merchantCategoryEnum = z.enum([
  "restaurant",
  "boutique",
  "transport",
  "service",
  "banque",
  "telecom",
  "autre",
]);

export const createMerchantSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(120, "Le nom ne peut pas dépasser 120 caractères"),
  description: z.string().max(500).optional(),
  category: merchantCategoryEnum.default("autre"),
  whatsapp: z
    .string()
    .regex(/^[+]?[\d\s\-]{8,15}$/, "Numéro WhatsApp invalide")
    .optional()
    .or(z.literal("")),
  mapsUrl: z
    .string()
    .url("URL Google Maps invalide")
    .optional()
    .or(z.literal("")),
  promoText: z.string().max(200).optional(),
  promoExpiry: z.string().datetime().optional(),
  logo: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateMerchantSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  category: merchantCategoryEnum.optional(),
  whatsapp: z
    .string()
    .regex(/^[+]?[\d\s\-]{8,15}$/, "Numéro WhatsApp invalide")
    .optional()
    .or(z.literal("")),
  mapsUrl: z
    .string()
    .url("URL Google Maps invalide")
    .optional()
    .or(z.literal("")),
  promoText: z.string().max(200).optional(),
  promoExpiry: z.string().datetime().optional().nullable(),
  logo: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;
export type UpdateMerchantInput = z.infer<typeof updateMerchantSchema>;
