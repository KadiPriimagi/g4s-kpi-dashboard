import { ErrorState } from "@/components/dashboard/error-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { geminiModel, isGeminiConfigured } from "@/lib/ai";
import { listSummaries } from "@/lib/records";
import { safeLoad } from "@/lib/safe-load";
import { SummaryPanel } from "./summary-panel";

export const metadata = { title: "AI Summary · G4S Marketing KPI Dashboard" };

export default async function AiSummaryPage() {
  const result = await safeLoad(() => listSummaries());
  return (
    <>
      <PageHeader
        title="AI Summary"
        description="Generate a written summary of the KPIs for the selected filters, with key findings and channel recommendations."
      />
      {!result.ok ? (
        <ErrorState message={result.error} />
      ) : (
        <SummaryPanel summaries={result.data} geminiConfigured={isGeminiConfigured()} model={geminiModel()} />
      )}
    </>
  );
}
