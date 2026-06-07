import { db } from "@/lib/db";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SlotType = "header" | "insert" | "sidebar" | "interstitial";

export interface EligibleCreative {
  id: string;
  campaignId: string;
  campaignName: string;
  advertiserName: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaText: string;
  // Scoring factors
  campaignPriority: number;
  budgetRemaining: number;
  cpmCost: number;
}

export interface AdResponse {
  creative: EligibleCreative;
  trackingToken: string; // base64-encoded payload for sendBeacon
}

// ─── Simple in-memory session tracker (per-session dedup for interstitial) ─────

const interstitialSessions = new Map<string, number>(); // sessionId → lastShown timestamp
const INTERSTITIAL_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if an interstitial ad can be shown for this session.
 */
export function canShowInterstitial(sessionId: string): boolean {
  const lastShown = interstitialSessions.get(sessionId) ?? 0;
  const now = Date.now();
  if (now - lastShown < INTERSTITIAL_COOLDOWN_MS) {
    return false;
  }
  interstitialSessions.set(sessionId, now);
  return true;
}

// ─── Core: Select best creative for a given station + slot ─────────────────────

/**
 * Weighted random selection algorithm.
 * Score = priority × budgetRemainingRatio + fairRandomization
 * Campaigns with exhausted budget or past end date are filtered out.
 */
export function selectCreative(
  candidates: EligibleCreative[]
): EligibleCreative | null {
  if (candidates.length === 0) return null;

  // Single candidate = immediate return
  if (candidates.length === 1) return candidates[0];

  // Calculate weights for each candidate
  const weights: number[] = candidates.map((c) => {
    // Priority factor (0-100 scale)
    const priorityFactor = c.campaignPriority + 1; // +1 to avoid zero

    // Budget remaining ratio (0-1)
    const budgetRatio =
      c.cpmCost > 0 ? Math.max(0, 1 - c.budgetRemaining / (c.cpmCost * 100)) : 1;

    // Remaining budget as a factor (higher remaining = more likely to show)
    const budgetFactor = c.budgetRemaining > 0 ? 1 + Math.log10(c.budgetRemaining + 1) : 0.1;

    // Fair randomization: slight noise to prevent same campaign dominating
    const randomFactor = 0.5 + Math.random() * 0.5;

    // Combined score
    return priorityFactor * budgetFactor * randomFactor * (1 - budgetRatio * 0.3);
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return candidates[i];
    }
  }

  // Fallback to last candidate (should rarely reach here)
  return candidates[candidates.length - 1];
}

// ─── Query eligible campaigns + creatives from DB ──────────────────────────────

export async function getEligibleCreatives(
  stationId: string,
  slotType: SlotType,
  limit = 10
): Promise<EligibleCreative[]> {
  const now = new Date();

  // Fetch active campaigns targeting this slot for this station
  const campaigns = await db.adCampaign.findMany({
    where: {
      stationId,
      targetingSlot: slotType,
      status: "active",
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      deletedAt: null,
    },
    include: {
      creatives: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { priority: "desc" },
    take: limit,
  });

  // Flatten to eligible creatives with scoring data
  const results: EligibleCreative[] = [];

  // Batch-fetch impression counts for all campaigns with maxImpressions cap
  const campaignsNeedingCount = campaigns.filter(c => c.maxImpressions);
  let impressionCounts: Map<string, number> = new Map();
  if (campaignsNeedingCount.length > 0) {
    const counts = await db.adImpression.groupBy({
      by: ["campaignId"],
      where: {
        campaignId: { in: campaignsNeedingCount.map(c => c.id) },
        type: "impression",
      },
      _count: true,
    });
    for (const row of counts) {
      impressionCounts.set(row.campaignId, row._count);
    }
  }

  for (const campaign of campaigns) {
    // Check budget exhaustion
    if (campaign.budgetTotal > 0 && campaign.budgetSpent >= campaign.budgetTotal) {
      // Auto-mark as exhausted
      await db.adCampaign.update({
        where: { id: campaign.id },
        data: { status: "exhausted" },
      });
      continue;
    }

    // Check max impressions cap (use batch-fetched count)
    if (campaign.maxImpressions) {
      const impressionCount = impressionCounts.get(campaign.id) ?? 0;
      if (impressionCount >= campaign.maxImpressions) {
        await db.adCampaign.update({
          where: { id: campaign.id },
          data: { status: "exhausted" },
        });
        continue;
      }
    }

    for (const creative of campaign.creatives) {
      results.push({
        id: creative.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        advertiserName: campaign.advertiserName,
        title: creative.title,
        body: creative.body,
        imageUrl: creative.imageUrl,
        linkUrl: creative.linkUrl,
        ctaText: creative.ctaText,
        campaignPriority: campaign.priority,
        budgetRemaining: campaign.budgetTotal - campaign.budgetSpent,
        cpmCost: campaign.cpmCost,
      });
    }
  }

  return results;
}

// ─── Serve an ad for a station + slot (main entry point) ───────────────────────

export async function serveAd(
  stationId: string,
  slotType: SlotType,
  sessionId?: string
): Promise<AdResponse | null> {
  // For interstitial, enforce cooldown
  if (slotType === "interstitial" && sessionId) {
    if (!canShowInterstitial(sessionId)) {
      return null;
    }
  }

  const candidates = await getEligibleCreatives(stationId, slotType);

  if (candidates.length === 0) return null;

  const creative = selectCreative(candidates);
  if (!creative) return null;

  // Generate tracking token (base64 payload for sendBeacon)
  const trackingPayload = JSON.stringify({
    campaignId: creative.campaignId,
    creativeId: creative.id,
    stationId,
    slotType,
    sessionId: sessionId ?? "",
  });
  const trackingToken = Buffer.from(trackingPayload).toString("base64url");

  return { creative, trackingToken };
}

// ─── Record impression or click ────────────────────────────────────────────────

export async function recordImpression(
  campaignId: string,
  creativeId: string,
  stationId: string,
  slotType: SlotType,
  type: "impression" | "click",
  sessionId?: string,
  userAgent?: string,
  referrer?: string
): Promise<{ success: boolean; budgetSpent: number }> {
  // Record the event
  await db.adImpression.create({
    data: {
      campaignId,
      creativeId,
      stationId,
      type,
      slotType,
      sessionId,
      userAgent,
      referrer,
    },
  });

  // Calculate cost and update campaign
  const campaign = await db.adCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return { success: true, budgetSpent: 0 };

  let costIncrement = 0;

  if (type === "impression" && campaign.cpmCost > 0) {
    // CPM: cost per 1000 impressions = cpmCost / 1000 per impression
    costIncrement = campaign.cpmCost / 1000;
  } else if (type === "click" && campaign.cpcCost > 0) {
    // CPC: flat cost per click
    costIncrement = campaign.cpcCost;
  }

  if (costIncrement > 0) {
    const newSpent = campaign.budgetSpent + costIncrement;

    // Check if campaign is now exhausted
    const isExhausted = campaign.budgetTotal > 0 && newSpent >= campaign.budgetTotal;

    await db.adCampaign.update({
      where: { id: campaignId },
      data: {
        budgetSpent: newSpent,
        ...(isExhausted ? { status: "exhausted" } : {}),
      },
    });
  }

  return { success: true, budgetSpent: costIncrement };
}

// ─── Campaign statistics ───────────────────────────────────────────────────────

export interface CampaignStats {
  totalImpressions: number;
  totalClicks: number;
  ctr: number; // click-through rate
  budgetSpent: number;
  budgetTotal: number;
  budgetUtilization: number; // percentage
}

export async function getCampaignStats(
  campaignId: string
): Promise<CampaignStats | null> {
  const campaign = await db.adCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return null;

  const impressions = await db.adImpression.count({
    where: { campaignId, type: "impression" },
  });

  const clicks = await db.adImpression.count({
    where: { campaignId, type: "click" },
  });

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const budgetUtilization =
    campaign.budgetTotal > 0
      ? (campaign.budgetSpent / campaign.budgetTotal) * 100
      : 0;

  return {
    totalImpressions: impressions,
    totalClicks: clicks,
    ctr,
    budgetSpent: campaign.budgetSpent,
    budgetTotal: campaign.budgetTotal,
    budgetUtilization,
  };
}
