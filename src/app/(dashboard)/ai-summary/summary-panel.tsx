"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, Loader2, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/client-api";
import { LANGUAGE_LABELS, campaignLabel } from "@/lib/constants";
import { formatDateLabel } from "@/lib/dates";
import { FILTER_KEYS, parseFilters } from "@/lib/filters";
import type { Recommendation } from "@/lib/ai";
import type { SummaryDTO } from "@/lib/records";

const fullDate = { day: "numeric", month: "short", year: "numeric" } as const;

function filtersLabel(from: string, to: string, campaign: string | null, language: string | null) {
  return [
    `${formatDateLabel(from, fullDate)} – ${formatDateLabel(to, fullDate)}`,
    campaign ? campaignLabel(campaign) : "All campaigns",
    language ? LANGUAGE_LABELS[language] : "All languages",
  ].join(" · ");
}

export function SummaryPanel({ summaries, geminiConfigured, model }: { summaries: SummaryDTO[]; geminiConfigured: boolean; model: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const filters = parseFilters(Object.fromEntries(params.entries()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestId, setLatestId] = useState<number | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      for (const key of FILTER_KEYS) {
        const v = params.get(key);
        if (v) body[key] = v;
      }
      const created = await apiRequest<SummaryDTO>("POST", "/api/summaries", body);
      setLatestId(created.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generating the summary failed.");
    } finally {
      setBusy(false);
    }
  }

  const [latest, ...older] = summaries;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Summary for the current filters</p>
            <p className="text-sm text-muted-foreground">{filtersLabel(filters.from, filters.to, filters.campaign, filters.language)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {geminiConfigured
                ? `Uses Google Gemini (${model}). Only aggregated KPI numbers are sent.`
                : "GEMINI_API_KEY is not set — a clearly labelled mock summary will be generated instead."}
            </p>
          </div>
          <Button onClick={generate} disabled={busy} size="lg">
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? "Generating…" : "Generate summary"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      {latest ? (
        <>
          <SummaryCard summary={latest} highlight={latest.id === latestId} defaultOpen />
          {older.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Previous summaries</h2>
              {older.map((s) => (
                <SummaryCard key={s.id} summary={s} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="rounded-xl border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
          No summaries yet. Choose the filters above and click “Generate summary”.
        </p>
      )}
    </div>
  );
}

function SummaryCard({ summary, highlight, defaultOpen = false }: { summary: SummaryDTO; highlight?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const created = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Tallinn" }).format(
    new Date(summary.createdAt),
  );

  return (
    <Card className={cn("gap-0 py-0 shadow-sm", highlight && "ring-2 ring-primary/40")}>
      <CardHeader className="p-0">
        <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-5 text-left">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {filtersLabel(summary.dateFrom, summary.dateTo, summary.filters.campaign, summary.filters.language)}
              {summary.isMock && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  Mock summary — not generated by AI
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Generated {created}
              {summary.model ? ` · ${summary.model}` : ""}
            </CardDescription>
          </div>
          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-5 border-t p-5">
          {summary.content ? (
            <>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold">Summary</h3>
                <p className="text-sm leading-relaxed text-foreground/90">{summary.content.summary}</p>
              </section>
              <section>
                <h3 className="mb-1.5 text-sm font-semibold">Key findings</h3>
                <ol className="space-y-2">
                  {summary.content.findings.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ol>
              </section>
              {summary.content.recommendations.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-sm font-semibold">Channel recommendations</h3>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {summary.content.recommendations.map((r, i) => (
                      <RecommendationItem key={i} rec={r} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <p className="whitespace-pre-wrap text-sm">{summary.rawContent}</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

const ACTIONS = {
  increase: { label: "Invest more", icon: TrendingUp, cls: "bg-positive/10 text-positive" },
  decrease: { label: "Invest less", icon: TrendingDown, cls: "bg-negative/10 text-negative" },
  maintain: { label: "Keep as is", icon: Minus, cls: "bg-muted text-muted-foreground" },
} as const;

function RecommendationItem({ rec }: { rec: Recommendation }) {
  const a = ACTIONS[rec.action] ?? ACTIONS.maintain;
  const Icon = a.icon;
  return (
    <li className="rounded-lg border p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{rec.channel}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", a.cls)}>
          <Icon className="size-3.5" />
          {a.label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{rec.reason}</p>
    </li>
  );
}
