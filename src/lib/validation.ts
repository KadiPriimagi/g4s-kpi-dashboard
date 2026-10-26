import { CHANNELS, MANUAL_COST_CAMPAIGNS, MANUAL_COST_CHANNELS, TARGET_METRICS, type TargetMetric } from "./constants";
import { daysBetween, isISODate } from "./dates";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface TargetInput {
  metric: TargetMetric;
  channel: string;
  month: string;
  value: number;
}

export interface CostInput {
  dateFrom: string;
  dateTo: string;
  channel: string;
  campaign: string;
  language: "ET" | "RU" | "BOTH";
  amount: number;
  note: string | null;
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function parseTargetInput(body: unknown): Result<TargetInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!TARGET_METRICS.includes(b.metric as TargetMetric)) return { ok: false, error: "Choose a metric." };
  const channel = String(b.channel ?? "");
  if (channel !== "All" && !(CHANNELS as readonly string[]).includes(channel)) return { ok: false, error: "Choose a channel." };
  const month = String(b.month ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: "Choose a month." };
  const value = toNumber(b.value);
  if (value == null || value < 0) return { ok: false, error: "Enter a target value of 0 or more." };
  if (b.metric === "conversionRate" && value > 100) return { ok: false, error: "Conversion rate is a percentage (0–100)." };
  if (value > 1e9) return { ok: false, error: "The target value is too large." };
  return { ok: true, data: { metric: b.metric as TargetMetric, channel, month, value } };
}

export function parseCostInput(body: unknown): Result<CostInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const dateFrom = b.dateFrom;
  const dateTo = b.dateTo || b.dateFrom;
  if (!isISODate(dateFrom) || !isISODate(dateTo)) return { ok: false, error: "Enter valid dates." };
  if (dateFrom > dateTo) return { ok: false, error: "The end date must be on or after the start date." };
  if (daysBetween(dateFrom, dateTo) > 366) return { ok: false, error: "A cost entry can cover at most one year." };
  const channel = String(b.channel ?? "");
  if (!(MANUAL_COST_CHANNELS as string[]).includes(channel)) {
    return { ok: false, error: "Only Meta costs are entered manually (Google costs are imported automatically)." };
  }
  const campaign = String(b.campaign ?? "");
  if (!(MANUAL_COST_CAMPAIGNS as string[]).includes(campaign)) return { ok: false, error: "Choose a campaign." };
  const language = String(b.language ?? "BOTH");
  if (!["ET", "RU", "BOTH"].includes(language)) return { ok: false, error: "Choose a language." };
  const amount = toNumber(b.amount);
  if (amount == null || amount <= 0) return { ok: false, error: "Enter an amount greater than 0." };
  if (amount > 10_000_000) return { ok: false, error: "The amount is too large." };
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 500) : null;
  return {
    ok: true,
    data: { dateFrom, dateTo, channel, campaign, language: language as CostInput["language"], amount: Math.round(amount * 100) / 100, note },
  };
}
