import { NextResponse } from "next/server";
import { apiHandler, badRequest } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { costDTO, listCosts } from "@/lib/records";
import { parseCostInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return apiHandler(async () => NextResponse.json(await listCosts()));
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const parsed = parseCostInput(await req.json().catch(() => null));
    if (!parsed.ok) return badRequest(parsed.error);
    const { dateFrom, dateTo, ...rest } = parsed.data;
    const c = await prisma.costEntry.create({
      data: { ...rest, dateFrom: parseISODate(dateFrom), dateTo: parseISODate(dateTo) },
    });
    return NextResponse.json(costDTO(c), { status: 201 });
  });
}
