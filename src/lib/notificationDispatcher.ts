// ─── Notification Dispatcher ─────────────────────────────────────────────────────
//
// Dispatches announcements when trip state transitions occur.
// Matches notification rules, renders templates, enqueues announcements.
// Supports repeat scheduling (e.g., delay announcements every 5min).
//

import { db } from "@/lib/db";
import { validateTransition, renderTemplate } from "@/lib/tripStateMachine";

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
 * Finds matching rules, renders templates, creates queue entries.
 */
export async function dispatchNotifications(
  ctx: DispatchContext
): Promise<DispatchResult> {
  const result: DispatchResult = { rulesMatched: 0, announcementsCreated: 0, errors: [] };

  try {
    // 1. Validate the transition (defensive)
    const validation = validateTransition(ctx.fromStatus, ctx.toStatus);
    if (!validation.valid || !validation.edge) {
      result.errors.push(`Transition invalide: ${ctx.fromStatus} → ${ctx.toStatus}`);
      return result;
    }

    // 2. Find matching active rules for this station + transition
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

    // 3. For each rule, create announcements
    for (const rule of rules) {
      try {
        const rendered = renderTemplate(rule.template, templateContext);

        // Immediate announcement
        await db.announcementQueue.create({
          data: {
            stationId: ctx.stationId,
            tripId: ctx.tripId,
            ruleId: rule.id,
            channel: rule.channel,
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
          const repeatTimes = rule.repeatMaxTimes > 0 ? rule.repeatMaxTimes : 5; // cap at 5 repeats
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
                channel: rule.channel,
                message: rule.template,
                renderedMessage: rendered,
                priority: rule.priority - i, // lower priority for repeats
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
  renderedMessage: string | null;
  channel: string;
  priority: number;
  scheduledAt: string;
  status: string;
  retryCount: number;
}

/**
 * Fetch pending announcements that are due (scheduledAt <= now).
 * Marks them as "playing" to prevent double-processing.
 * Returns the queue items for the client to consume.
 */
export async function fetchDueAnnouncements(
  stationId: string
): Promise<QueueItem[]> {
  const now = new Date();

  // Fetch and lock pending announcements due for playback
  const items = await db.announcementQueue.findMany({
    where: {
      stationId,
      status: "pending",
      scheduledAt: { lte: now },
    },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: 10,
  });

  if (items.length === 0) return [];

  // Mark as playing
  await db.announcementQueue.updateMany({
    where: {
      id: { in: items.map((i) => i.id) },
    },
    data: {
      status: "playing",
      updatedAt: new Date(),
    },
  });

  return items.map((i) => ({
    id: i.id,
    renderedMessage: i.renderedMessage,
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
    // Reset to pending so it can be retried
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
