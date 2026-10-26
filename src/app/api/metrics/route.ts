import { NextResponse, type NextRequest } from "next/server";
import { apiHandler } from "@/lib/api";
import { parseFilters } from "@/lib/filters";
import { getDashboardData } from "@/lib/metrics";

export const dynamic = "force-dynamic";

/** Aggregated KPIs for the given filters (same query string as the dashboard pages). */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const filters = parseFilters(Object.fromEntries(req.nextUrl.searchParams.entries()));
    const data = await getDashboardData(filters);
    return NextResponse.json({ filters, ...data });
  });
}
