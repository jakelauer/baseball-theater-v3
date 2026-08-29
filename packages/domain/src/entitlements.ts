import type { Entitlements, PatronTier } from "./types.js";

const TIER_RANK: Record<PatronTier, number> = {
  none: 0,
  Backer: 1,
  "Pro Backer": 2,
  "Star Backer": 3,
  "Premium Sponsor": 4,
};

export function entitlementsForTier(tier: PatronTier): Entitlements {
  const rank = TIER_RANK[tier];
  return {
    tier,
    fasterLiveRefresh: rank >= TIER_RANK.Backer,
    cloudSyncedSettings: rank >= TIER_RANK.Backer,
    savantLinks: rank >= TIER_RANK["Pro Backer"],
  };
}

export function parsePatronTier(title: string | null | undefined): PatronTier {
  if (!title) return "none";
  const t = title.trim();
  if (t in TIER_RANK) return t as PatronTier;
  // Patreon reward titles sometimes vary slightly
  const lower = t.toLowerCase();
  if (lower.includes("premium")) return "Premium Sponsor";
  if (lower.includes("star")) return "Star Backer";
  if (lower.includes("pro")) return "Pro Backer";
  if (lower.includes("backer")) return "Backer";
  return "none";
}

export function hasMinimumTier(current: PatronTier, required: PatronTier): boolean {
  return TIER_RANK[current] >= TIER_RANK[required];
}
