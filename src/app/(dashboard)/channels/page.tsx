import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorState } from "@/components/dashboard/error-state";
import { CHANNELS } from "@/lib/constants";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { loadPeriod, withRates, type ChannelRow } from "@/lib/metrics";
import { safeLoad } from "@/lib/safe-load";
import { ChannelsView } from "./channels-view";

export const metadata = { title: "Channels · G4S Marketing KPI Dashboard" };

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const result = await safeLoad(() => loadPeriod(filters));

  return (
    <>
      <PageHeader title="Channels" description="Performance by marketing channel. Click a column header to sort." />
      {!result.ok ? (
        <ErrorState message={result.error} />
      ) : (
        <ChannelsView
          rows={CHANNELS.map(
            (channel): ChannelRow =>
              result.data.byChannel.find((r) => r.channel === channel) ??
              { channel, ...withRates({ sessions: 0, servicePageViews: 0, formViews: 0, formStarts: 0, leads: 0, cost: 0 }) },
          )}
        />
      )}
    </>
  );
}
