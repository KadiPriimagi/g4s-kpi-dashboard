import { NextResponse } from "next/server";
import { AiError, buildPayload, generateWithGemini, geminiModel, isGeminiConfigured, mockSummary } from "@/lib/ai";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { parseFilters } from "@/lib/filters";
import { getDashboardData } from "@/lib/metrics";
import { listSummaries, summaryDTO } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET() {
  return apiHandler(async () => NextResponse.json(await listSummaries()));
}

/** Body: the dashboard filter params ({ range, from, to, campaign, lang }). */
export async function POST(req: Request) {
  return apiHandler(async () => {
    const body = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
    const filters = parseFilters(body);
    const data = await getDashboardData(filters);
    if (data.current.totals.sessions === 0) {
      return NextResponse.json({ error: "There is no data for the selected filters, so there is nothing to summarise." }, { status: 400 });
    }

    const payload = buildPayload(filters, data);
    const useGemini = isGeminiConfigured();
    let content;
    try {
      content = useGemini ? await generateWithGemini(payload) : mockSummary(payload);
    } catch (err) {
      if (err instanceof AiError) return NextResponse.json({ error: err.message }, { status: 502 });
      throw err;
    }

    const saved = await prisma.aiSummary.create({
      data: {
        dateFrom: parseISODate(filters.from),
        dateTo: parseISODate(filters.to),
        filters: { range: filters.range, campaign: filters.campaign, language: filters.language },
        content: JSON.stringify(content),
        isMock: !useGemini,
        model: useGemini ? geminiModel() : null,
      },
    });
    return NextResponse.json(summaryDTO(saved), { status: 201 });
  });
}
