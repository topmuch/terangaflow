// ─── Audio Partition Builder ─────────────────────────────────────────────────────
//
// Generates structured audio sequences for each trip status transition.
// Each sequence is a chain of ding-dong + TTS segments that the kiosk PA system plays.
//

// ─── Audio Segment Types ──────────────────────────────────────────────────────────

export interface DingDongSegment {
  type: "ding-dong";
}

export interface TtsSegment {
  type: "tts";
  text: string;
  lang?: string;
}

export interface Mp3Segment {
  type: "mp3";
  src: string;
}

export type AudioSegment = DingDongSegment | TtsSegment | Mp3Segment;

// ─── Partition Context ────────────────────────────────────────────────────────────

export interface PartitionContext {
  destination: string;       // e.g., "Dakar — Saint-Louis"
  platform: string | null;   // e.g., "A1"
  operatorName?: string;     // e.g., "SATAS"
  delayMinutes?: number;     // for DELAYED status
  lineCode?: string;         // e.g., "DSL"
}

// ─── Audio Sequence per Status ───────────────────────────────────────────────────

/**
 * BOARDING (Embarquement):
 * 🔊 ding-dong → 🗣️ "Le bus à destination de" → 🗣️ [Ville] → 🗣️ "est en cours d'embarquement au quai" → 🗣️ [Numéro]
 */
function buildBoardingSequence(ctx: PartitionContext): AudioSegment[] {
  const platformText = ctx.platform ? ` au quai ${ctx.platform}` : "";
  const operatorText = ctx.operatorName ? `, ${ctx.operatorName}` : "";

  return [
    { type: "ding-dong" },
    { type: "tts", text: `Le bus à destination de ${ctx.destination}` },
    { type: "tts", text: `est en cours d'embarquement${platformText}.${operatorText}` },
  ];
}

/**
 * DELAYED (Retard):
 * 🔊 ding-dong → 🗣️ "Le bus à destination de" → 🗣️ [Ville] → 🗣️ "est en retard de" → 🗣️ [X] → 🗣️ "minutes."
 */
function buildDelayedSequence(ctx: PartitionContext): AudioSegment[] {
  const delay = ctx.delayMinutes ?? 0;
  const operatorText = ctx.operatorName ? `, ${ctx.operatorName}` : "";

  return [
    { type: "ding-dong" },
    { type: "tts", text: `Le bus à destination de ${ctx.destination}` },
    { type: "tts", text: `est en retard de ${delay} minute${delay > 1 ? "s" : ""}.${operatorText}` },
    { type: "tts", text: "Nous vous prions de bien vouloir nous excuser pour ce désagrément." },
  ];
}

/**
 * DEPARTURE_IMMINENT (Départ imminent — not in state machine but can be triggered):
 * 🔊 ding-dong → 🗣️ "Dernier appel. Le bus pour" → 🗣️ [Ville] → 🗣️ "va partir dans 2 minutes. Quai" → 🗣️ [Numéro]
 */
function buildDepartureImminentSequence(ctx: PartitionContext): AudioSegment[] {
  const platformText = ctx.platform ? ` au quai ${ctx.platform}` : "";

  return [
    { type: "ding-dong" },
    { type: "tts", text: `Dernier appel. Le bus pour ${ctx.destination}` },
    { type: "tts", text: `va partir dans deux minutes${platformText}.` },
    { type: "tts", text: "Passagers, veuillez monter à bord." },
  ];
}

/**
 * DEPARTED (Parti):
 * 🔊 ding-dong → 🗣️ "Le bus à destination de" → 🗣️ [Ville] → 🗣️ "vient de partir. Bon voyage."
 */
function buildDepartedSequence(ctx: PartitionContext): AudioSegment[] {
  return [
    { type: "ding-dong" },
    { type: "tts", text: `Le bus à destination de ${ctx.destination}` },
    { type: "tts", text: "vient de partir. Bon voyage !" },
  ];
}

/**
 * CANCELLED (Annulé):
 * 🔊 ding-dong → 🗣️ "Attention. Le bus à destination de" → 🗣️ [Ville] → 🗣️ "est annulé."
 */
function buildCancelledSequence(ctx: PartitionContext): AudioSegment[] {
  return [
    { type: "ding-dong" },
    { type: "tts", text: `Attention. Le bus à destination de ${ctx.destination}` },
    { type: "tts", text: "est annulé. Veuillez vous rapprocher du guichet pour plus d'informations." },
  ];
}

/**
 * ARRIVED (Arrivé):
 * 🔊 ding-dong → 🗣️ "Le bus en provenance de" → 🗣️ [Ville] → 🗣️ "est arrivé."
 */
function buildArrivedSequence(ctx: PartitionContext): AudioSegment[] {
  return [
    { type: "ding-dong" },
    { type: "tts", text: `Le bus en provenance de ${ctx.destination}` },
    { type: "tts", text: "est arrivé à destination." },
  ];
}

// ─── Public API ──────────────────────────────────────────────────────────────────

export interface AudioPartitionResult {
  segments: AudioSegment[];
  title: string;
}

/**
 * Build the audio sequence for a given trip status transition.
 * Returns the sequence and a human-readable title for the announcement queue.
 */
export function buildAudioPartition(
  status: string,
  ctx: PartitionContext
): AudioPartitionResult | null {
  const upper = status.toUpperCase();

  switch (upper) {
    case "BOARDING":
      return {
        segments: buildBoardingSequence(ctx),
        title: `🟡 Embarquement : ${ctx.destination}`,
      };

    case "DELAYED":
      return {
        segments: buildDelayedSequence(ctx),
        title: `🔴 Retard : ${ctx.destination} (+${ctx.delayMinutes ?? 0} min)`,
      };

    case "DEPARTURE_IMMINENT":
      return {
        segments: buildDepartureImminentSequence(ctx),
        title: `🟠 Départ imminent : ${ctx.destination}`,
      };

    case "DEPARTED":
      return {
        segments: buildDepartedSequence(ctx),
        title: `✅ Départ : ${ctx.destination}`,
      };

    case "CANCELLED":
      return {
        segments: buildCancelledSequence(ctx),
        title: `❌ Annulation : ${ctx.destination}`,
      };

    case "ARRIVED":
      return {
        segments: buildArrivedSequence(ctx),
        title: `🏁 Arrivée : ${ctx.destination}`,
      };

    default:
      return null; // No audio for SCHEDULED, etc.
  }
}

/**
 * Get all valid status transitions that should trigger an audio announcement.
 */
export const ANNOUNCEABLE_STATUSES = [
  "BOARDING",
  "DELAYED",
  "DEPARTURE_IMMINENT",
  "DEPARTED",
  "CANCELLED",
  "ARRIVED",
] as const;

export type AnnouncableStatus = (typeof ANNOUNCEABLE_STATUSES)[number];
