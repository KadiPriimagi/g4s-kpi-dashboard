// Shared constants (also used by the seed script, so keep imports relative).

export const CHANNELS = [
  "Google PMax",
  "Google Search",
  "Meta",
  "Organic Search",
  "Direct",
  "Email",
  "Referral",
] as const;
export type Channel = (typeof CHANNELS)[number];

/** Channels whose cost is stored in DailyMetric.cost (imported automatically). */
export const AUTO_COST_CHANNELS: Channel[] = ["Google PMax", "Google Search"];
/** Channels whose cost comes only from manually entered CostEntry rows. */
export const MANUAL_COST_CHANNELS: Channel[] = ["Meta"];

export const NO_CAMPAIGN = "(none)";

export const CAMPAIGNS = [
  "Always-on PMax",
  "Always-on Search",
  "Always-on Meta",
  "Autumn image campaign",
  NO_CAMPAIGN,
] as const;
export type Campaign = (typeof CAMPAIGNS)[number];

/** Campaigns that can carry manually entered (Meta) costs. */
export const MANUAL_COST_CAMPAIGNS: Campaign[] = ["Always-on Meta", "Autumn image campaign"];

export function campaignLabel(c: string) {
  return c === NO_CAMPAIGN ? "No campaign (organic)" : c;
}

export const LANGUAGES = ["ET", "RU"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_LABELS: Record<string, string> = {
  ET: "Estonian",
  RU: "Russian",
  BOTH: "Both",
};

export const TARGET_METRICS = ["leads", "sessions", "cost", "conversionRate", "cpl"] as const;
export type TargetMetric = (typeof TARGET_METRICS)[number];
export const TARGET_METRIC_LABELS: Record<TargetMetric, string> = {
  leads: "Leads",
  sessions: "Sessions",
  cost: "Total cost (EUR)",
  conversionRate: "Conversion rate (%)",
  cpl: "Cost per lead (EUR)",
};
/** Rate metrics are averaged (day-weighted) instead of prorated. */
export const RATE_METRICS: TargetMetric[] = ["conversionRate", "cpl"];

/** Length of the Autumn image campaign and its offset from the first day of demo data. */
export const AUTUMN_CAMPAIGN_OFFSET_DAYS = 84;
export const AUTUMN_CAMPAIGN_LENGTH_DAYS = 28;
export const DEMO_DAYS = 120;
