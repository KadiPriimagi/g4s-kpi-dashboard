import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiHandler, badRequest } from "@/lib/api";
import { prisma } from "@/lib/db";
import { targetDTO } from "@/lib/records";
import { parseTargetInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json({ error: "This target no longer exists." }, { status: 404 });
}

export async function PUT(req: Request, { params }: Ctx) {
  return apiHandler(async () => {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return notFound();
    const parsed = parseTargetInput(await req.json().catch(() => null));
    if (!parsed.ok) return badRequest(parsed.error);
    try {
      const t = await prisma.target.update({ where: { id }, data: { ...parsed.data, isSeed: false } });
      return NextResponse.json(targetDTO(t));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") return notFound();
        if (err.code === "P2002") {
          return NextResponse.json({ error: "A target for this metric, channel and month already exists." }, { status: 409 });
        }
      }
      throw err;
    }
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return apiHandler(async () => {
    const id = Number((await params).id);
    if (!Number.isInteger(id)) return notFound();
    const { count } = await prisma.target.deleteMany({ where: { id } });
    return count ? NextResponse.json({ ok: true }) : notFound();
  });
}
