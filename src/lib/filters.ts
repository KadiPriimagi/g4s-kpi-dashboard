import { CAMPAIGNS, CHANNELS, LANGUAGES, type Language } from "./constants";
import { addDays, daysBetween, isISODate, yesterdayTallinn } from "./dates";

export const RANGE_PRESETS = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type RangePreset = keyof typeof RANGE_PRESETS | "custom";

export interface Filters {
  range: RangePreset;
  from: string;
  to: string;
  campaign: string | null; // null = all campaigns
  language: Language | null; // null = all languages
  channel?: string | null;
}

export type SearchParams = Record<string, string | string[] | undefined>;

const MAX_DAYS = 366;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function parseFilters(sp: SearchParams): Filters {
  const yesterday = yesterdayTallinn();
  let range = (first(sp.range) ?? "30d") as RangePreset;
  let from: string;
  let to: string;

  const cFrom = first(sp.from);
  const cTo = first(sp.to);
  if (range === "custom" && isISODate(cFrom) && isISODate(cTo) && cFrom <= cTo) {
    from = cFrom;
    to = cTo;
    if (daysBetween(from, to) > MAX_DAYS) from = addDays(to, -(MAX_DAYS - 1));
  } else {
    if (!(range in RANGE_PRESETS)) range = "30d";
    const days = RANGE_PRESETS[range as keyof typeof RANGE_PRESETS];
    to = yesterday;
    from = addDays(yesterday, -(days - 1));
  }

  const campaign = first(sp.campaign);
  const language = first(sp.lang);
  const channel = first(sp.channel);
  return {
    range,
    from,
    to,
    campaign: campaign && (CAMPAIGNS as readonly string[]).includes(campaign) ? campaign : null,
    language: language && (LANGUAGES as readonly string[]).includes(language) ? (language as Language) : null,
    channel: channel && (CHANNELS as readonly string[]).includes(channel) ? channel : null,
  };
}

/** The same number of days immediately before the selected range. */
export function previousPeriod(f: Filters): { from: string; to: string } {
  const days = daysBetween(f.from, f.to);
  return { from: addDays(f.from, -days), to: addDays(f.from, -1) };
}

export function hasSegmentFilter(f: Filters) {
  return Boolean(f.campaign || f.language);
}

/** Query-string keys that belong to the global filters (kept when navigating). */
export const FILTER_KEYS = ["range", "from", "to", "campaign", "lang"] as const;
