import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiHandler, badRequest } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { costDTO } from "@/lib/records";
import { parseCostInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json({ error: "This cost entry no longer exists." }, { status: 404 });
}

export async function PUT(req: Request, { params }: Ctx) {
  return apiHandler(async () => {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return notFound();
    const parsed = parseCostInput(await req.json().catch(() => null));
    if (!parsed.ok) return badRequest(parsed.error);
    const { dateFrom, dateTo, ...rest } = parsed.data;
    try {
      // An edited entry becomes user-owned, so the demo top-up never overwrites it.
      const c = await prisma.costEntry.update({
        where: { id },
        data: { ...rest, dateFrom: parseISODate(dateFrom), dateTo: parseISODate(dateTo), isSeed: false },
      });
      return NextResponse.json(costDTO(c));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return notFound();
      throw err;
    }
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return apiHandler(async () => {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return notFound();
    const { count } = await prisma.costEntry.deleteMany({ where: { id } });
    return count ? NextResponse.json({ ok: true }) : notFound();
  });
}
