import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { listCosts } from "@/lib/records";
import { safeLoad } from "@/lib/safe-load";
import { CostsManager } from "./costs-manager";

export const metadata = { title: "Costs · G4S Marketing KPI Dashboard" };

export default async function CostsPage() {
  const result = await safeLoad(listCosts);
  return (
    <>
      <PageHeader
        title="Costs"
        description="Manually entered ad costs (e.g. Meta invoices from the media agency). Each amount is spread evenly over its period and included in cost and CPL."
      />
      {!result.ok ? <ErrorState message={result.error} /> : <CostsManager costs={result.data} />}
    </>
  );
}
