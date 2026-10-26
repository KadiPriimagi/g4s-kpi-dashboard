import "server-only";
import type { CostEntry, Target } from "@prisma/client";
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
