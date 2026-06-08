// ─── Notification Dispatcher ─────────────────────────────────────────────────────
//
// Dispatches announcements when trip state transitions occur.
// Matches notification rules, renders templates, enqueues announcements.
// Generates audio partition payloads for kiosk PA playback.
//

import { db } from "@/lib/db";
import { validateTransition, renderTemplate } from "@/lib/tripStateMachine";
import { buildAudioPartition, type PartitionContext } from "@/lib/audioPartitionBuilder";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DispatchContext {
  tripId: string;
  stationId: string;
  destination: string;
  lineCode: string;
  lineName: string;
  operatorName: string;
  platform: string | null;
  departureTime: string;       // ISO
  fromStatus: string;
  toStatus: string;
  delayMinutes: number;        // computed from original departure time
  triggeredBy?: string;
  reason?: string;
}

export interface DispatchResult {
  rulesMatched: number;
  announcementsCreated: number;
  audioPayload: boolean;       // whether audio partition was generated
  errors: string[];
}

// ─── Template variable extraction ─────────────────────────────────────────────

function buildTemplateContext(ctx: DispatchContext): Record<string, string | number | null> {
  return {
    destination: ctx.destination,
    platform: ctx.platform,
    delay: ctx.delayMinutes > 0 ? `${ctx.delayMinutes} minutes` : null,
    operator: ctx.operatorName,
    lineCode: ctx.lineCode,
    lineName: ctx.lineName,
  };
}

// ─── Core dispatch logic ────────────────────────────────────────────────────────

/**
 * Main dispatcher entry point.
 * Called after a successful state transition.
 * 1. Generates audio partition payload for kiosk PA
 * 2. Finds matching rules, renders templates, creates queue entries
 */
export async function dispatchNotifications(
  ctx: DispatchContext
): Promise<DispatchResult> {
  const result: DispatchResult = { rulesMatched: 0, announcementsCreated: 0, audioPayload: false, errors: [] };

  try {
    // 1. Validate the transition (defensive)
    const validation = validateTransition(ctx.fromStatus, ctx.toStatus);
    if (!validation.valid || !validation.edge) {
      result.errors.push(`Transition invalide: ${ctx.fromStatus} → ${ctx.toStatus}`);
      return result;
    }

    // 2. Generate audio partition for kiosk PA
    const partitionCtx: PartitionContext = {
      destination: ctx.destination,
      platform: ctx.platform,
      operatorName: ctx.operatorName,
      delayMinutes: ctx.delayMinutes,
      lineCode: ctx.lineCode,
    };

    const audioPartition = buildAudioPartition(ctx.toStatus, partitionCtx);

    if (audioPartition) {
      try {
        await db.announcementQueue.create({
          data: {
            stationId: ctx.stationId,
            tripId: ctx.tripId,
            type: "trip_status",
            channel: "VOCAL_PA",
            title: audioPartition.title,
            message: `${ctx.fromStatus} → ${ctx.toStatus}`,
            payload: JSON.stringify(audioPartition.segments),
            priority: 100, // High priority — trip status changes are most important
            status: "pending",
            scheduledAt: new Date(), // immediate
          },
        });
        result.audioPayload = true;
        result.announcementsCreated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        result.errors.push(`Audio partition: ${msg}`);
      }
    }

    // 3. Find matching active rules for this station + transition (custom rules)
    const rules = await db.notificationRule.findMany({
      where: {
        stationId: ctx.stationId,
        triggerFrom: ctx.fromStatus.toUpperCase(),
        triggerTo: ctx.toStatus.toUpperCase(),
        isActive: true,
        deletedAt: null,
      },
      orderBy: { priority: "desc" },
    });

    if (rules.length === 0) {
      return result;
    }

    result.rulesMatched = rules.length;
    const templateContext = buildTemplateContext(ctx);

    // 4. For each rule, create announcements
    for (const rule of rules) {
      try {
        const rendered = renderTemplate(rule.template, templateContext);

        // Immediate announcement
        await db.announcementQueue.create({
          data: {
            stationId: ctx.stationId,
            tripId: ctx.tripId,
            ruleId: rule.id,
            type: "rule",
            channel: rule.channel,
            title: `Règle: ${rule.name}`,
            message: rule.template,
            renderedMessage: rendered,
            priority: rule.priority,
            status: "pending",
            scheduledAt: new Date(), // immediate
          },
        });

        result.announcementsCreated++;

        // Repeat announcements (e.g., delay every 5min)
        if (rule.repeatEveryMin > 0) {
          const repeatTimes = rule.repeatMaxTimes > 0 ? rule.repeatMaxTimes : 5;
          const now = new Date();

          for (let i = 1; i <= repeatTimes; i++) {
            const scheduledAt = new Date(
              now.getTime() + i * rule.repeatEveryMin * 60 * 1000
            );

            await db.announcementQueue.create({
              data: {
                stationId: ctx.stationId,
                tripId: ctx.tripId,
                ruleId: rule.id,
                type: "rule",
                channel: rule.channel,
                title: `Règle: ${rule.name} (répétition ${i})`,
                message: rule.template,
                renderedMessage: rendered,
                priority: rule.priority - i,
                status: "pending",
                scheduledAt,
              },
            });

            result.announcementsCreated++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        result.errors.push(`Règle "${rule.name}": ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    result.errors.push(`Dispatch global: ${msg}`);
  }

  return result;
}

// ─── Queue Worker ────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  type: string;
  title: string | null;
  renderedMessage: string | null;
  payload: string | null;       // JSON audio segments
  channel: string;
  priority: number;
  scheduledAt: string;
  status: string;
  retryCount: number;
}

/**
 * Fetch pending announcements that are due (scheduledAt <= now).
 * Returns the queue items for the client to consume.
 * Does NOT lock them — the kiosk will mark them as played.
 */
export async function fetchDueAnnouncements(
  stationId: string
): Promise<QueueItem[]> {
  const now = new Date();

  const items = await db.announcementQueue.findMany({
    where: {
      stationId,
      status: "pending",
      scheduledAt: { lte: now },
    },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: 5,
  });

  if (items.length === 0) return [];

  return items.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    renderedMessage: i.renderedMessage,
    payload: i.payload,
    channel: i.channel,
    priority: i.priority,
    scheduledAt: i.scheduledAt.toISOString(),
    status: i.status,
    retryCount: i.retryCount,
  }));
}

/**
 * Mark an announcement as completed after successful playback.
 */
export async function completeAnnouncement(
  announcementId: string
): Promise<void> {
  await db.announcementQueue.update({
    where: { id: announcementId },
    data: {
      status: "completed",
      playedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark an announcement as failed and increment retry count.
 * If max retries exceeded, mark as permanently failed.
 */
export async function failAnnouncement(
  announcementId: string,
  error: string
): Promise<void> {
  const item = await db.announcementQueue.findUnique({
    where: { id: announcementId },
  });

  if (!item) return;

  const newRetryCount = item.retryCount + 1;

  if (newRetryCount >= item.maxRetries) {
    await db.announcementQueue.update({
      where: { id: announcementId },
      data: {
        status: "failed",
        retryCount: newRetryCount,
        error,
        updatedAt: new Date(),
      },
    });
  } else {
    await db.announcementQueue.update({
      where: { id: announcementId },
      data: {
        status: "pending",
        retryCount: newRetryCount,
        error,
        updatedAt: new Date(),
      },
    });
  }
}
