import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { listTargets } from "@/lib/records";
import { safeLoad } from "@/lib/safe-load";
import { TargetsManager } from "./targets-manager";

export const metadata = { title: "Targets · G4S Marketing KPI Dashboard" };

export default async function TargetsPage() {
  const result = await safeLoad(listTargets);
  return (
    <>
      <PageHeader
        title="Targets"
        description="Monthly targets. Targets for “All” channels are shown on the Overview page (prorated for the selected period)."
      />
      {!result.ok ? <ErrorState message={result.error} /> : <TargetsManager targets={result.data} />}
    </>
  );
}
