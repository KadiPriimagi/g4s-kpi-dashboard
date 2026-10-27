import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { formatNumber, formatPercent } from "@/lib/format";
import { loadPeriod, type Totals } from "@/lib/metrics";
import { safeLoad } from "@/lib/safe-load";
import { ChannelSelect } from "./channel-select";

export const metadata = { title: "Funnel · G4S Marketing KPI Dashboard" };

const STAGES: { key: keyof Totals; label: string }[] = [
  { key: "sessions", label: "Sessions" },
  { key: "servicePageViews", label: "Service page views" },
  { key: "formViews", label: "Form views" },
  { key: "formStarts", label: "Form starts" },
  { key: "leads", label: "Form submits (leads)" },
];

export default async function FunnelPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const result = await safeLoad(() => loadPeriod(filters));

  return (
    <>
      <PageHeader title="Funnel" description="From the first visit to a submitted contact form.">
        <ChannelSelect value={filters.channel ?? null} />
      </PageHeader>
      {!result.ok ? <ErrorState message={result.error} /> : <Funnel totals={result.data.totals} channel={filters.channel ?? null} />}
    </>
  );
}

function Funnel({ totals, channel }: { totals: Totals; channel: string | null }) {
  const top = totals.sessions;
  const stages = STAGES.map((s, i) => {
    const count = totals[s.key];
    const prev = i > 0 ? totals[STAGES[i - 1].key] : null;
    return {
      ...s,
      count,
      ofTotal: top > 0 ? (count / top) * 100 : null,
      dropOff: prev != null && prev > 0 ? ((prev - count) / prev) * 100 : null,
    };
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Conversion funnel {channel ? `· ${channel}` : "· all channels"}</CardTitle>
        <CardDescription>Bar width shows the share of sessions that reach each stage; drop-off is measured from the previous stage.</CardDescription>
      </CardHeader>
      <CardContent>
        {top === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No sessions for the selected filters.</p>
        ) : (
          <ol className="space-y-2">
            {stages.map((s, i) => (
              <li key={s.key}>
                {s.dropOff != null && (
                  <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
                    <span className="h-3 w-px bg-border" />
                    <span>
                      <span className="font-medium text-negative">−{formatPercent(s.dropOff)}</span> drop-off
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[180px_1fr_150px]">
                  <div className="text-sm font-medium">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {s.label}
                  </div>
                  <div className="flex justify-center">
                    <div
                      className="relative flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-primary-foreground shadow-sm"
                      style={{
                        width: `${Math.max(6, s.ofTotal ?? 0)}%`,
                        background: `color-mix(in oklch, var(--primary) ${100 - i * 14}%, var(--chart-2))`,
                      }}
                    >
                      {/* Narrow bars can't fit the number, so it goes next to the bar instead. */}
                      {(s.ofTotal ?? 0) >= 25 ? (
                        <span className="px-2 tabular-nums">{formatNumber(s.count)}</span>
                      ) : (
                        <span className="absolute left-full ml-2 whitespace-nowrap text-foreground tabular-nums">{formatNumber(s.count)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <span className="tabular-nums">{formatPercent(s.ofTotal)}</span> of sessions
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
