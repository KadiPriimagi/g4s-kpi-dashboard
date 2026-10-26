// Deterministic demo-data generator. The same date always produces the same numbers,
// so restarts and top-ups are stable.
import {
  AUTUMN_CAMPAIGN_LENGTH_DAYS,
  AUTUMN_CAMPAIGN_OFFSET_DAYS,
  NO_CAMPAIGN,
  type Channel,
  type Language,
} from "../src/lib/constants";
import { addDays, daysBetween, parseISODate } from "../src/lib/dates";

export interface DemoRow {
  date: string;
  channel: Channel;
  campaign: string;
  language: Language;
  source: string;
  medium: string;
  sessions: number;
  servicePageViews: number;
  formViews: number;
  formStarts: number;
  leads: number;
  cost: number;
}

export interface DemoDay {
  rows: DemoRow[];
  /** Meta spend per campaign and language (goes into CostEntry, not DailyMetric). */
  metaSpend: Record<string, Record<Language, number>>;
}

interface Stream {
  channel: Channel;
  campaign: string;
  sources: [source: string, medium: string, share: number][];
  sessions: number; // baseline daily sessions, both languages
  cr: number; // leads / sessions
  cpc: number; // cost per session in EUR (0 = no cost)
  ruShare: number;
  formViewRate: number; // form views / sessions (roughly)
}

const ALWAYS_ON: Stream[] = [
  { channel: "Google PMax", campaign: "Always-on PMax", sources: [["google", "cpc", 1]], sessions: 220, cr: 0.016, cpc: 0.55, ruShare: 0.35, formViewRate: 0.1 },
  { channel: "Google Search", campaign: "Always-on Search", sources: [["google", "cpc", 1]], sessions: 260, cr: 0.028, cpc: 0.95, ruShare: 0.3, formViewRate: 0.15 },
  { channel: "Meta", campaign: "Always-on Meta", sources: [["facebook", "paid_social", 0.7], ["instagram", "paid_social", 0.3]], sessions: 140, cr: 0.007, cpc: 0.32, ruShare: 0.4, formViewRate: 0.06 },
  { channel: "Organic Search", campaign: NO_CAMPAIGN, sources: [["google", "organic", 0.88], ["bing", "organic", 0.07], ["duckduckgo", "organic", 0.05]], sessions: 420, cr: 0.018, cpc: 0, ruShare: 0.3, formViewRate: 0.1 },
  { channel: "Direct", campaign: NO_CAMPAIGN, sources: [["(direct)", "(none)", 1]], sessions: 210, cr: 0.022, cpc: 0, ruShare: 0.28, formViewRate: 0.12 },
  { channel: "Email", campaign: NO_CAMPAIGN, sources: [["newsletter", "email", 1]], sessions: 35, cr: 0.03, cpc: 0, ruShare: 0.25, formViewRate: 0.14 },
  { channel: "Referral", campaign: NO_CAMPAIGN, sources: [["kv.ee", "referral", 0.35], ["delfi.ee", "referral", 0.3], ["g4s.com", "referral", 0.2], ["1182.ee", "referral", 0.15]], sessions: 65, cr: 0.015, cpc: 0, ruShare: 0.3, formViewRate: 0.09 },
];

const AUTUMN: Stream[] = [
  { channel: "Meta", campaign: "Autumn image campaign", sources: [["facebook", "paid_social", 0.65], ["instagram", "paid_social", 0.35]], sessions: 480, cr: 0.009, cpc: 0.27, ruShare: 0.45, formViewRate: 0.07 },
  { channel: "Google PMax", campaign: "Autumn image campaign", sources: [["google", "cpc", 1]], sessions: 190, cr: 0.014, cpc: 0.6, ruShare: 0.35, formViewRate: 0.09 },
];

// Sun..Sat
const WEEKDAY = [0.65, 1.08, 1.1, 1.06, 1.02, 0.92, 0.62];
// Jan..Dec
const SEASON = [0.95, 0.97, 1, 1, 0.98, 0.93, 0.88, 0.95, 1.03, 1.06, 1.04, 0.92];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounds randomly so small expected values still produce realistic integers. */
function stochasticRound(x: number, r: () => number) {
  const f = Math.floor(x);
  return f + (r() < x - f ? 1 : 0);
}

export function autumnWindow(firstDay: string): [string, string] {
  const start = addDays(firstDay, AUTUMN_CAMPAIGN_OFFSET_DAYS);
  return [start, addDays(start, AUTUMN_CAMPAIGN_LENGTH_DAYS - 1)];
}

export function generateDay(date: string, firstDay: string): DemoDay {
  const d = parseISODate(date);
  const [aStart, aEnd] = autumnWindow(firstDay);
  const inAutumn = date >= aStart && date <= aEnd;
  const dayIndex = daysBetween(firstDay, date);
  const base = WEEKDAY[d.getUTCDay()] * SEASON[d.getUTCMonth()] * (1 + 0.0008 * dayIndex);
  const dom = d.getUTCDate();
  const newsletterDay = dom === 2 || dom === 16;

  const streams = inAutumn ? [...ALWAYS_ON, ...AUTUMN] : ALWAYS_ON;
  const rows: DemoRow[] = [];
  const metaSpend: DemoDay["metaSpend"] = {};

  for (const s of streams) {
    let factor = base;
    if (s.channel === "Email") factor *= newsletterDay ? 8 : 0.7;
    if (inAutumn && s.channel === "Organic Search") factor *= 1.08;
    if (inAutumn && s.channel === "Direct") factor *= 1.12;
    if (inAutumn && s.campaign === "Autumn image campaign") {
      // Ramp up in the first days, fade slightly at the end.
      const k = daysBetween(aStart, date);
      factor *= Math.min(1, 0.6 + k * 0.1) * (k > AUTUMN_CAMPAIGN_LENGTH_DAYS - 5 ? 0.85 : 1);
    }

    for (const language of ["ET", "RU"] as Language[]) {
      const langShare = language === "RU" ? s.ruShare : 1 - s.ruShare;
      for (const [source, medium, share] of s.sources) {
        const r = rng(`${date}|${s.channel}|${s.campaign}|${language}|${source}`);
        const noise = () => 0.85 + r() * 0.3;
        const sessions = stochasticRound(s.sessions * factor * langShare * share * noise(), r);
        const leads = stochasticRound(sessions * s.cr * noise(), r);
        const formStarts = Math.max(leads, stochasticRound((sessions * s.cr * noise()) / 0.55, r));
        const formViews = Math.max(formStarts, stochasticRound(sessions * s.formViewRate * noise(), r));
        const servicePageViews = Math.min(sessions, Math.max(formViews, stochasticRound(sessions * 0.52 * noise(), r)));
        const spend = Math.round(sessions * s.cpc * noise() * 100) / 100;

        let cost = 0;
        if (s.channel === "Meta") {
          metaSpend[s.campaign] ??= { ET: 0, RU: 0 };
          metaSpend[s.campaign][language] += spend;
        } else {
          cost = spend;
        }

        rows.push({
          date,
          channel: s.channel,
          campaign: s.campaign,
          language,
          source,
          medium,
          sessions,
          servicePageViews,
          formViews,
          formStarts,
          leads,
          cost,
        });
      }
    }
  }

  return { rows, metaSpend };
}
