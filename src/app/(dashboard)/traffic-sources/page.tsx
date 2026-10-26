import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SourcesDonut } from "@/components/charts/sources-donut";
import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { formatNumber, formatPercent } from "@/lib/format";
import { loadPeriod, type SourceRow } from "@/lib/metrics";
import { safeLoad } from "@/lib/safe-load";

export const metadata = { title: "Traffic Sources · G4S Marketing KPI Dashboard" };

const DONUT_SLICES = 7;

export default async function TrafficSourcesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const result = await safeLoad(() => loadPeriod(filters));

  return (
    <>
      <PageHeader title="Traffic Sources" description="Sessions by source / medium." />
      {!result.ok ? <ErrorState message={result.error} /> : <Sources rows={result.data.bySource} />}
    </>
  );
}

function Sources({ rows }: { rows: SourceRow[] }) {
  const total = rows.reduce((s, r) => s + r.sessions, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const top = rows.slice(0, DONUT_SLICES).map((r) => ({ name: r.sourceMedium, value: r.sessions }));
  const rest = rows.slice(DONUT_SLICES).reduce((s, r) => s + r.sessions, 0);
  const donut = rest > 0 ? [...top, { name: "Other", value: rest }] : top;

  if (total === 0) {
    return <p className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">No sessions for the selected filters.</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Share of sessions</CardTitle>
          <CardDescription>Top {DONUT_SLICES} sources; the rest are grouped as Other.</CardDescription>
        </CardHeader>
        <CardContent>
          <SourcesDonut data={donut} total={total} />
        </CardContent>
      </Card>

      <Card className="py-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Source / medium</TableHead>
                <TableHead className="px-4 text-right">Sessions</TableHead>
                <TableHead className="px-4 text-right">Share</TableHead>
                <TableHead className="px-4 text-right">Leads</TableHead>
                <TableHead className="px-4 text-right">Conv. rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.sourceMedium}>
                  <TableCell className="px-4 font-medium">{r.sourceMedium}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatNumber(r.sessions)}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatPercent((r.sessions / total) * 100)}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatNumber(r.leads)}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">
                    {formatPercent(r.sessions ? (r.leads / r.sessions) * 100 : null)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="px-4">Total</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatNumber(total)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">100.0%</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatNumber(totalLeads)}</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{formatPercent((totalLeads / total) * 100)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
