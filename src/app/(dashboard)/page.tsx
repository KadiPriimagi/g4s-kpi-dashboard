import { Euro, MousePointerClick, Percent, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { ErrorState } from "@/components/dashboard/error-state";
import { KpiCard, type KpiTarget } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { daysBetween } from "@/lib/dates";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { formatCPL, formatEUR, formatNumber, formatPercent, percentChange } from "@/lib/format";
import { getDashboardData } from "@/lib/metrics";
import { safeLoad } from "@/lib/safe-load";
import type { TargetMetric } from "@/lib/constants";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const result = await safeLoad(() => getDashboardData(filters));

  return (
    <>
      <PageHeader title="Overview" description="Key marketing KPIs for the selected period." />
      {!result.ok ? (
        <ErrorState message={result.error} />
      ) : (
        <OverviewContent data={result.data} days={daysBetween(filters.from, filters.to)} />
      )}
    </>
  );
}

function OverviewContent({ data, days }: { data: Awaited<ReturnType<typeof getDashboardData>>; days: number }) {
  const cur = data.current.totals;
  const prev = data.previous.totals;
  const previousLabel = `vs previous ${days} days`;
  const targets = data.targets.status === "ok" ? data.targets.targets : {};

  const target = (metric: TargetMetric, actual: number | null, fmt: (v: number) => string, kind: KpiTarget["kind"], goodWhen: KpiTarget["goodWhen"]): KpiTarget | null => {
    const t = targets[metric];
    return t ? { kind, actual, target: t.target, targetLabel: fmt(t.target), goodWhen } : null;
  };

  return (
    <div className="space-y-6">
      {data.targets.status === "hidden" && (
        <p className="rounded-lg border bg-card px-4 py-2 text-sm text-muted-foreground">
          {data.targets.reason}. Target progress is hidden while a campaign or language filter is active.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <KpiCard
          title="Leads"
          icon={Users}
          value={formatNumber(cur.leads)}
          change={{ value: percentChange(cur.leads, prev.leads), unit: "percent", goodWhen: "up" }}
          previousLabel={previousLabel}
          target={target("leads", cur.leads, formatNumber, "progress", "up")}
        />
        <KpiCard
          title="Conversion rate"
          icon={Percent}
          value={formatPercent(cur.conversionRate)}
          change={{
            value: cur.conversionRate != null && prev.conversionRate != null ? cur.conversionRate - prev.conversionRate : null,
            unit: "points",
            goodWhen: "up",
          }}
          previousLabel={previousLabel}
          target={target("conversionRate", cur.conversionRate, formatPercent, "threshold", "up")}
        />
        <KpiCard
          title="Cost per lead"
          icon={Euro}
          value={formatCPL(cur.cpl)}
          change={{ value: percentChange(cur.cpl, prev.cpl), unit: "percent", goodWhen: "down" }}
          previousLabel={previousLabel}
          target={target("cpl", cur.cpl, (v) => formatEUR(v, 2), "threshold", "down")}
        />
        <KpiCard
          title="Total cost"
          icon={Wallet}
          value={formatEUR(cur.cost)}
          change={{ value: percentChange(cur.cost, prev.cost), unit: "percent", goodWhen: "down" }}
          previousLabel={previousLabel}
          target={target("cost", cur.cost, (v) => formatEUR(v), "progress", "down")}
        />
        <KpiCard
          title="Sessions"
          icon={MousePointerClick}
          value={formatNumber(cur.sessions)}
          change={{ value: percentChange(cur.sessions, prev.sessions), unit: "percent", goodWhen: "up" }}
          previousLabel={previousLabel}
          target={target("sessions", cur.sessions, formatNumber, "progress", "up")}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Daily leads and sessions</CardTitle>
          <CardDescription>Leads on the left axis, sessions on the right axis.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={data.current.daily.map((d) => ({ date: d.date, leads: d.leads, sessions: d.sessions }))} />
        </CardContent>
      </Card>
    </div>
  );
}
