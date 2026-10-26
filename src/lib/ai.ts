import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AUTO_COST_CHANNELS, MANUAL_COST_CHANNELS, campaignLabel } from "./constants";
import { addDays, daysBetween, eachDay } from "./dates";
import type { Filters } from "./filters";
import { percentChange } from "./format";
import type { DashboardData } from "./metrics";

export interface Recommendation {
  channel: string;
  action: "increase" | "decrease" | "maintain";
  reason: string;
}

export interface SummaryContent {
  summary: string;
  findings: string[];
  recommendations: Recommendation[];
}

export class AiError extends Error {}

export function geminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

const round = (v: number | null, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Compact, aggregated data for the model (no raw rows, no personal data). */
export function buildPayload(f: Filters, data: DashboardData) {
  const cur = data.current;
  const kpis = (t: DashboardData["current"]["totals"]) => ({
    sessions: t.sessions,
    leads: t.leads,
    conversionRatePct: round(t.conversionRate),
    costEur: round(t.cost),
    cplEur: round(t.cpl),
  });

  // Weekly totals keep the trend visible without sending every day.
  const weeks: { weekStarting: string; sessions: number; leads: number; costEur: number }[] = [];
  for (let start = cur.from; start <= cur.to; start = addDays(start, 7)) {
    const end = addDays(start, 6) < cur.to ? addDays(start, 6) : cur.to;
    const days = new Set(eachDay(start, end));
    const pts = cur.daily.filter((d) => days.has(d.date));
    weeks.push({
      weekStarting: start,
      sessions: pts.reduce((s, d) => s + d.sessions, 0),
      leads: pts.reduce((s, d) => s + d.leads, 0),
      costEur: round(pts.reduce((s, d) => s + d.cost, 0))!,
    });
  }

  return {
    company: "G4S Eesti (security services in Estonia) — demo data",
    period: { from: cur.from, to: cur.to, days: daysBetween(cur.from, cur.to) },
    previousPeriod: {
      from: data.previous.from,
      to: data.previous.to,
      note: data.previous.complete ? undefined : "Demo data does not fully cover the previous period; do not compare with it.",
    },
    filters: {
      campaign: f.campaign ? campaignLabel(f.campaign) : "All campaigns",
      language: f.language === "ET" ? "Estonian" : f.language === "RU" ? "Russian" : "All languages",
    },
    totals: { current: kpis(cur.totals), previous: data.previous.complete ? kpis(data.previous.totals) : null },
    channels: cur.byChannel.map((c) => {
      const prev = data.previous.byChannel.find((p) => p.channel === c.channel);
      return {
        channel: c.channel,
        paid: [...AUTO_COST_CHANNELS, ...MANUAL_COST_CHANNELS].includes(c.channel as never),
        ...kpis(c),
        leadsChangePct: data.previous.complete ? round(percentChange(c.leads, prev?.leads ?? null), 1) : null,
        cplChangePct: data.previous.complete ? round(percentChange(c.cpl, prev?.cpl ?? null), 1) : null,
      };
    }),
    funnel: {
      sessions: cur.totals.sessions,
      servicePageViews: cur.totals.servicePageViews,
      formViews: cur.totals.formViews,
      formStarts: cur.totals.formStarts,
      leads: cur.totals.leads,
    },
    topSources: cur.bySource.slice(0, 8).map((s) => ({ sourceMedium: s.sourceMedium, sessions: s.sessions, leads: s.leads })),
    targetsForPeriod:
      data.targets.status === "ok"
        ? Object.fromEntries(Object.values(data.targets.targets).map((t) => [t!.metric, round(t!.target)]))
        : "Not applicable (campaign or language filter active)",
    weeklyTrend: weeks,
  };
}

const SYSTEM_INSTRUCTION = `You are a senior performance-marketing analyst for G4S Eesti, a security services company in Estonia
(alarm systems, guarding, video surveillance, for homes and businesses). You receive aggregated marketing KPI data.
Write in clear, concise English for a marketing manager. Be concrete and quote numbers (EUR, %, counts).
Channels with "paid": false have no ad cost (organic search, direct, newsletter email, referral): never recommend ad budget
for them, but you may recommend effort (e.g. SEO content, newsletter frequency). A null CPL means there is no cost.
Compare with the previous period and the targets when available.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "Short performance summary, 3-4 sentences." },
    findings: {
      type: "array",
      description: "Exactly the 3 most important findings, one sentence each.",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
    recommendations: {
      type: "array",
      description: "Recommendations on which channels to invest more or less in for future campaigns.",
      items: {
        type: "object",
        properties: {
          channel: { type: "string" },
          action: { type: "string", enum: ["increase", "decrease", "maintain"] },
          reason: { type: "string" },
        },
        required: ["channel", "action", "reason"],
      },
    },
  },
  required: ["summary", "findings", "recommendations"],
};

function validate(raw: unknown): SummaryContent {
  const r = raw as Partial<SummaryContent>;
  if (!r || typeof r.summary !== "string" || !Array.isArray(r.findings) || !Array.isArray(r.recommendations)) {
    throw new AiError("The AI response was not in the expected format. Please try again.");
  }
  return {
    summary: r.summary,
    findings: r.findings.filter((x): x is string => typeof x === "string").slice(0, 3),
    recommendations: r.recommendations
      .filter((x) => x && typeof x.channel === "string" && typeof x.reason === "string")
      .map((x) => ({
        channel: x.channel,
        action: (["increase", "decrease", "maintain"] as const).includes(x.action) ? x.action : "maintain",
        reason: x.reason,
      })),
  };
}

export async function generateWithGemini(payload: ReturnType<typeof buildPayload>): Promise<SummaryContent> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
  let text: string | undefined;
  try {
    const res = await ai.models.generateContent({
      model: geminiModel(),
      contents: `Analyse this marketing KPI data and respond in the requested JSON format.\n\n${JSON.stringify(payload)}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
        httpOptions: { timeout: 60_000 },
      },
    });
    text = res.text;
  } catch (err) {
    console.error("[ai] Gemini request failed:", err);
    throw new AiError("The AI service (Gemini) could not be reached or returned an error. Please try again later.");
  }
  if (!text) throw new AiError("Gemini returned an empty response. Please try again.");
  try {
    return validate(JSON.parse(text));
  } catch (err) {
    if (err instanceof AiError) throw err;
    throw new AiError("The AI response could not be read. Please try again.");
  }
}

/** Rule-based stand-in used when GEMINI_API_KEY is not set. Clearly labelled as a mock in the UI. */
export function mockSummary(payload: ReturnType<typeof buildPayload>): SummaryContent {
  const { current, previous } = payload.totals;
  const fmtPct = (v: number | null) => (v == null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
  const eur = (v: number | null) => (v == null ? "–" : `€${v.toFixed(2)}`);
  const leadsChange = previous ? percentChange(current.leads, previous.leads) : null;
  const cplChange = previous ? percentChange(current.cplEur, previous.cplEur) : null;

  const paid = payload.channels.filter((c) => c.paid && c.cplEur != null).sort((a, b) => a.cplEur! - b.cplEur!);
  const best = paid[0];
  const worst = paid.length > 1 ? paid[paid.length - 1] : undefined;
  const topLeads = [...payload.channels].sort((a, b) => b.leads - a.leads)[0];

  const findings = [
    best ? `${best.channel} had the lowest cost per lead at ${eur(best.cplEur)} (${best.leads} leads).` : "No paid channel had both cost and leads.",
    worst ? `${worst.channel} had the highest cost per lead at ${eur(worst.cplEur)}.` : "Only one paid channel had cost data.",
    topLeads ? `${topLeads.channel} brought the most leads (${topLeads.leads}), with a conversion rate of ${topLeads.conversionRatePct ?? "–"}%.` : "No leads in this period.",
  ];

  const recommendations: Recommendation[] = paid.map((c, i) => ({
    channel: c.channel,
    action: i === 0 && paid.length > 1 ? "increase" : i === paid.length - 1 && paid.length > 1 ? "decrease" : "maintain",
    reason: `CPL ${eur(c.cplEur)} with ${c.leads} leads (${fmtPct(c.cplChangePct)} CPL vs previous period).`,
  }));

  return {
    summary:
      `In ${payload.period.from} – ${payload.period.to} the website had ${current.sessions.toLocaleString("en-US")} sessions and ` +
      `${current.leads} leads (${fmtPct(leadsChange)} vs the previous period). Total cost was €${(current.costEur ?? 0).toFixed(0)} ` +
      `and the cost per lead was ${eur(current.cplEur)} (${fmtPct(cplChange)}). Conversion rate: ${current.conversionRatePct ?? "–"}%.`,
    findings,
    recommendations,
  };
}
