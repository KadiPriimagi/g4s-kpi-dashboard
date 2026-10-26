"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Trophy, TrendingDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCPL, formatEUR, formatNumber, formatPercent } from "@/lib/format";
import type { ChannelRow } from "@/lib/metrics";

type SortKey = "channel" | "sessions" | "leads" | "conversionRate" | "cost" | "cpl";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "channel", label: "Channel" },
  { key: "sessions", label: "Sessions", align: "right" },
  { key: "leads", label: "Leads", align: "right" },
  { key: "conversionRate", label: "Conv. rate", align: "right" },
  { key: "cost", label: "Cost", align: "right" },
  { key: "cpl", label: "CPL", align: "right" },
];

const CHART_METRICS = {
  sessions: { label: "Sessions", format: formatNumber },
  leads: { label: "Leads", format: formatNumber },
  cost: { label: "Cost", format: (v: number) => formatEUR(v) },
  cpl: { label: "Cost per lead", format: (v: number) => formatCPL(v) },
} as const;
type ChartMetric = keyof typeof CHART_METRICS;

export function ChannelsView({ rows }: { rows: ChannelRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "leads", dir: "desc" });
  const [chartMetric, setChartMetric] = useState<ChartMetric>("leads");

  // Best/worst CPL among channels that have cost.
  const withCpl = rows.filter((r) => r.cpl != null);
  const best = withCpl.length >= 2 ? withCpl.reduce((a, b) => (b.cpl! < a.cpl! ? b : a)) : null;
  const worst = withCpl.length >= 2 ? withCpl.reduce((a, b) => (b.cpl! > a.cpl! ? b : a)) : null;

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "channel") return a.channel.localeCompare(b.channel) * dir;
      const av = a[sort.key];
      const bv = b[sort.key];
      // Channels without a value ("–") always go last.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    });
  }, [rows, sort]);

  const totals = rows.reduce(
    (t, r) => ({ sessions: t.sessions + r.sessions, leads: t.leads + r.leads, cost: t.cost + r.cost }),
    { sessions: 0, leads: 0, cost: 0 },
  );

  const chartData = [...rows]
    .map((r) => ({ channel: r.channel, value: r[chartMetric] }))
    .filter((d) => d.value != null)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "channel" ? "asc" : "desc" }));
  }

  return (
    <div className="space-y-6">
      {best && worst && (
        <div className="grid gap-4 md:grid-cols-2">
          <HighlightCard kind="best" row={best} />
          <HighlightCard kind="worst" row={worst} />
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{CHART_METRICS[chartMetric].label} by channel</CardTitle>
            <CardDescription>
              {chartMetric === "cpl" ? "Only channels with ad cost have a CPL." : "Selected period and filters."}
            </CardDescription>
          </div>
          <Select value={chartMetric} onValueChange={(v) => setChartMetric(v as ChartMetric)}>
            <SelectTrigger className="w-[160px]" aria-label="Chart metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHART_METRICS).map(([k, m]) => (
                <SelectItem key={k} value={k}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => CHART_METRICS[chartMetric].format(v)}
                />
                <YAxis type="category" dataKey="channel" width={110} tick={{ fontSize: 12, fill: "var(--foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(v) => [CHART_METRICS[chartMetric].format(Number(v)), CHART_METRICS[chartMetric].label]}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {chartData.map((d) => (
                    <Cell
                      key={d.channel}
                      fill={
                        chartMetric === "cpl" && d.channel === best?.channel
                          ? "var(--positive)"
                          : chartMetric === "cpl" && d.channel === worst?.channel
                            ? "var(--negative)"
                            : "var(--chart-1)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead key={c.key} className={cn("px-4", c.align === "right" && "text-right")}>
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={cn("inline-flex items-center gap-1 font-medium hover:text-foreground", c.align === "right" && "flex-row-reverse")}
                    >
                      {c.label}
                      {sort.key === c.key ? (
                        sort.dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow
                  key={r.channel}
                  className={cn(r.channel === best?.channel && "bg-positive/5", r.channel === worst?.channel && "bg-negative/5")}
                >
                  <TableCell className="px-4 font-medium">
                    <span className="flex items-center gap-2">
                      {r.channel}
                      {r.channel === best?.channel && <Badge className="bg-positive/15 text-positive">Best CPL</Badge>}
                      {r.channel === worst?.channel && <Badge className="bg-negative/15 text-negative">Worst CPL</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatNumber(r.sessions)}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatNumber(r.leads)}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatPercent(r.conversionRate)}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{r.cost > 0 ? formatEUR(r.cost) : "–"}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatCPL(r.cpl)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="px-4">Total</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatNumber(totals.sessions)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatNumber(totals.leads)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  {formatPercent(totals.sessions ? (totals.leads / totals.sessions) * 100 : null)}
                </TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatEUR(totals.cost)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  {formatCPL(totals.cost > 0 && totals.leads > 0 ? totals.cost / totals.leads : null)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function HighlightCard({ kind, row }: { kind: "best" | "worst"; row: ChannelRow }) {
  const best = kind === "best";
  const Icon = best ? Trophy : TrendingDown;
  return (
    <Card className={cn("gap-0 py-0 shadow-sm", best ? "border-positive/30" : "border-negative/30")}>
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            best ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{best ? "Best channel by CPL" : "Worst channel by CPL"}</p>
          <p className="truncate text-lg font-semibold">{row.channel}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-semibold tabular-nums">{formatCPL(row.cpl)}</p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(row.leads)} leads · {formatEUR(row.cost)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
