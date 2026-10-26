import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { RATE_METRICS, TARGET_METRICS, type TargetMetric } from "./constants";
import { daysBetween, daysInMonth, eachDay, monthsInRange, overlap, parseISODate, toISODate } from "./dates";
import { hasSegmentFilter, previousPeriod, type Filters } from "./filters";

export interface Totals {
  sessions: number;
  servicePageViews: number;
  formViews: number;
  formStarts: number;
  leads: number;
  cost: number;
}

export interface Kpis extends Totals {
  /** Percent (leads / sessions × 100), null without sessions. */
  conversionRate: number | null;
  /** EUR per lead, null when there is no cost or no leads (shown as "–"). */
  cpl: number | null;
}

export interface DailyPoint extends Totals {
  date: string;
}

export interface ChannelRow extends Kpis {
  channel: string;
}

export interface SourceRow {
  sourceMedium: string;
  source: string;
  medium: string;
  sessions: number;
  leads: number;
}

export interface PeriodData {
  from: string;
  to: string;
  totals: Kpis;
  daily: DailyPoint[];
  byChannel: ChannelRow[];
  bySource: SourceRow[];
}

type RangeFilters = Pick<Filters, "from" | "to" | "campaign" | "language" | "channel">;

const emptyTotals = (): Totals => ({ sessions: 0, servicePageViews: 0, formViews: 0, formStarts: 0, leads: 0, cost: 0 });

export function withRates<T extends Totals>(t: T): T & Kpis {
  return {
    ...t,
    conversionRate: t.sessions > 0 ? (t.leads / t.sessions) * 100 : null,
    cpl: t.cost > 0 && t.leads > 0 ? t.cost / t.leads : null,
  };
}

function addInto(target: Totals, src: Partial<Totals>) {
  target.sessions += src.sessions ?? 0;
  target.servicePageViews += src.servicePageViews ?? 0;
  target.formViews += src.formViews ?? 0;
  target.formStarts += src.formStarts ?? 0;
  target.leads += src.leads ?? 0;
  target.cost += src.cost ?? 0;
}

function metricWhere(f: RangeFilters): Prisma.DailyMetricWhereInput {
  return {
    date: { gte: parseISODate(f.from), lte: parseISODate(f.to) },
    ...(f.campaign ? { campaign: f.campaign } : {}),
    ...(f.language ? { language: f.language } : {}),
    ...(f.channel ? { channel: f.channel } : {}),
  };
}

/**
 * Spreads manually entered costs evenly over their period and returns the share that falls
 * into the filtered range, per day and channel.
 * - Language-specific entries count only for that language.
 * - "BOTH" entries are split by that language's share of the channel's sessions for the same campaign
 *   (fallback: all sessions of the channel that day; then 50/50).
 */
async function allocatedCosts(f: RangeFilters): Promise<{ date: string; channel: string; amount: number }[]> {
  const entries = await prisma.costEntry.findMany({
    where: {
      dateFrom: { lte: parseISODate(f.to) },
      dateTo: { gte: parseISODate(f.from) },
      ...(f.campaign ? { campaign: f.campaign } : {}),
      ...(f.channel ? { channel: f.channel } : {}),
      ...(f.language ? { language: { in: [f.language, "BOTH"] } } : {}),
    },
  });
  if (!entries.length) return [];

  // Session counts by day/channel/campaign/language, only needed to split "BOTH" entries.
  const shareKey = (d: string, channel: string, campaign: string | null, lang: string | null) =>
    `${d}|${channel}|${campaign ?? "*"}|${lang ?? "*"}`;
  const sessions = new Map<string, number>();
  if (f.language && entries.some((e) => e.language === "BOTH")) {
    const channels = [...new Set(entries.map((e) => e.channel))];
    const groups = await prisma.dailyMetric.groupBy({
      by: ["date", "channel", "campaign", "language"],
      where: { date: { gte: parseISODate(f.from), lte: parseISODate(f.to) }, channel: { in: channels } },
      _sum: { sessions: true },
    });
    for (const g of groups) {
      const d = toISODate(g.date);
      const s = g._sum.sessions ?? 0;
      for (const key of [
        shareKey(d, g.channel, g.campaign, g.language),
        shareKey(d, g.channel, g.campaign, null),
        shareKey(d, g.channel, null, g.language),
        shareKey(d, g.channel, null, null),
      ]) {
        sessions.set(key, (sessions.get(key) ?? 0) + s);
      }
    }
  }

  const languageShare = (d: string, channel: string, campaign: string, lang: string) => {
    const all = sessions.get(shareKey(d, channel, campaign, null)) ?? 0;
    if (all > 0) return (sessions.get(shareKey(d, channel, campaign, lang)) ?? 0) / all;
    const channelAll = sessions.get(shareKey(d, channel, null, null)) ?? 0;
    if (channelAll > 0) return (sessions.get(shareKey(d, channel, null, lang)) ?? 0) / channelAll;
    return 0.5;
  };

  const out: { date: string; channel: string; amount: number }[] = [];
  for (const e of entries) {
    const eFrom = toISODate(e.dateFrom);
    const eTo = toISODate(e.dateTo);
    const range = overlap(eFrom, eTo, f.from, f.to);
    if (!range) continue;
    const perDay = Number(e.amount) / daysBetween(eFrom, eTo);
    for (const d of eachDay(range[0], range[1])) {
      let amount = perDay;
      if (f.language && e.language === "BOTH") amount *= languageShare(d, e.channel, e.campaign, f.language);
      out.push({ date: d, channel: e.channel, amount });
    }
  }
  return out;
}

export async function loadPeriod(f: RangeFilters): Promise<PeriodData> {
  const [groups, costs] = await Promise.all([
    prisma.dailyMetric.groupBy({
      by: ["date", "channel", "source", "medium"],
      where: metricWhere(f),
      _sum: { sessions: true, servicePageViews: true, formViews: true, formStarts: true, leads: true, cost: true },
    }),
    allocatedCosts(f),
  ]);

  const totals = emptyTotals();
  const daily = new Map<string, Totals>(eachDay(f.from, f.to).map((d) => [d, emptyTotals()]));
  const byChannel = new Map<string, Totals>();
  const bySource = new Map<string, SourceRow>();

  for (const g of groups) {
    const row: Totals = {
      sessions: g._sum.sessions ?? 0,
      servicePageViews: g._sum.servicePageViews ?? 0,
      formViews: g._sum.formViews ?? 0,
      formStarts: g._sum.formStarts ?? 0,
      leads: g._sum.leads ?? 0,
      cost: Number(g._sum.cost ?? 0),
    };
    const d = toISODate(g.date);
    addInto(totals, row);
    if (daily.has(d)) addInto(daily.get(d)!, row);
    if (!byChannel.has(g.channel)) byChannel.set(g.channel, emptyTotals());
    addInto(byChannel.get(g.channel)!, row);
    const sm = `${g.source} / ${g.medium}`;
    const src = bySource.get(sm) ?? { sourceMedium: sm, source: g.source, medium: g.medium, sessions: 0, leads: 0 };
    src.sessions += row.sessions;
    src.leads += row.leads;
    bySource.set(sm, src);
  }

  for (const c of costs) {
    totals.cost += c.amount;
    if (daily.has(c.date)) daily.get(c.date)!.cost += c.amount;
    if (!byChannel.has(c.channel)) byChannel.set(c.channel, emptyTotals());
    byChannel.get(c.channel)!.cost += c.amount;
  }

  return {
    from: f.from,
    to: f.to,
    totals: withRates(totals),
    daily: [...daily.entries()].map(([date, t]) => ({ date, ...t })),
    byChannel: [...byChannel.entries()].map(([channel, t]) => ({ channel, ...withRates(t) })),
    bySource: [...bySource.values()].sort((a, b) => b.sessions - a.sessions),
  };
}

// ---------------------------------------------------------------------------
// Targets

export interface TargetProgress {
  metric: TargetMetric;
  /** Prorated (counts) or day-weighted (rates) target for the selected range. */
  target: number;
}

export type TargetsResult =
  | { status: "hidden"; reason: string }
  | { status: "ok"; targets: Partial<Record<TargetMetric, TargetProgress>> };

/**
 * Targets are monthly and apply to all campaigns and languages.
 * Counts are prorated per day; rates use the day-weighted average of the monthly values.
 * A metric gets a target only if every month touched by the range has one.
 */
export async function targetsForRange(f: Filters, channel = "All"): Promise<TargetsResult> {
  if (hasSegmentFilter(f)) {
    return { status: "hidden", reason: "Targets apply to all campaigns and languages" };
  }
  const months = monthsInRange(f.from, f.to);
  const rows = await prisma.target.findMany({
    where: { channel, month: { in: months.map((m) => m.month) } },
  });
  const totalDays = daysBetween(f.from, f.to);
  const targets: Partial<Record<TargetMetric, TargetProgress>> = {};

  for (const metric of TARGET_METRICS) {
    let sum = 0;
    let complete = true;
    for (const { month, days } of months) {
      const t = rows.find((r) => r.metric === metric && r.month === month);
      if (!t) {
        complete = false;
        break;
      }
      const value = Number(t.value);
      if (RATE_METRICS.includes(metric)) sum += value * (days / totalDays);
      else sum += (value / daysInMonth(month)) * days;
    }
    if (complete) targets[metric] = { metric, target: sum };
  }
  return { status: "ok", targets };
}

// ---------------------------------------------------------------------------

export interface DashboardData {
  current: PeriodData;
  previous: { from: string; to: string; totals: Kpis };
  targets: TargetsResult;
}

export async function getDashboardData(f: Filters): Promise<DashboardData> {
  const prev = previousPeriod(f);
  const [current, previous, targets] = await Promise.all([
    loadPeriod(f),
    loadPeriod({ ...f, ...prev }),
    targetsForRange(f),
  ]);
  return { current, previous: { ...prev, totals: previous.totals }, targets };
}
