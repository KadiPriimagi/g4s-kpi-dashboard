import "server-only";
import type { AiSummary, CostEntry, Target } from "@prisma/client";
import type { SummaryContent } from "./ai";
import { prisma } from "./db";
import { toISODate } from "./dates";

export interface TargetDTO {
  id: number;
  metric: string;
  channel: string;
  month: string;
  value: number;
  isSeed: boolean;
}

export interface CostDTO {
  id: number;
  dateFrom: string;
  dateTo: string;
  channel: string;
  campaign: string;
  language: string;
  amount: number;
  note: string | null;
  isSeed: boolean;
  createdAt: string;
}

export const targetDTO = (t: Target): TargetDTO => ({
  id: t.id,
  metric: t.metric,
  channel: t.channel,
  month: t.month,
  value: Number(t.value),
  isSeed: t.isSeed,
});

export const costDTO = (c: CostEntry): CostDTO => ({
  id: c.id,
  dateFrom: toISODate(c.dateFrom),
  dateTo: toISODate(c.dateTo),
  channel: c.channel,
  campaign: c.campaign,
  language: c.language,
  amount: Number(c.amount),
  note: c.note,
  isSeed: c.isSeed,
  createdAt: c.createdAt.toISOString(),
});

export async function listTargets() {
  const rows = await prisma.target.findMany({ orderBy: [{ month: "desc" }, { metric: "asc" }, { channel: "asc" }] });
  return rows.map(targetDTO);
}

export async function listCosts() {
  const rows = await prisma.costEntry.findMany({ orderBy: [{ dateFrom: "desc" }, { campaign: "asc" }, { id: "desc" }] });
  return rows.map(costDTO);
}

export interface SummaryDTO {
  id: number;
  dateFrom: string;
  dateTo: string;
  filters: { campaign: string | null; language: string | null };
  content: SummaryContent | null;
  /** Raw text when the stored content is not valid JSON. */
  rawContent: string | null;
  isMock: boolean;
  model: string | null;
  createdAt: string;
}

export const summaryDTO = (s: AiSummary): SummaryDTO => {
  let content: SummaryDTO["content"] = null;
  try {
    content = JSON.parse(s.content);
  } catch {
    content = null;
  }
  const filters = (s.filters ?? {}) as { campaign?: string | null; language?: string | null };
  return {
    id: s.id,
    dateFrom: toISODate(s.dateFrom),
    dateTo: toISODate(s.dateTo),
    filters: { campaign: filters.campaign ?? null, language: filters.language ?? null },
    content,
    rawContent: content ? null : s.content,
    isMock: s.isMock,
    model: s.model,
    createdAt: s.createdAt.toISOString(),
  };
};

export async function listSummaries(limit = 50) {
  const rows = await prisma.aiSummary.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(summaryDTO);
}
