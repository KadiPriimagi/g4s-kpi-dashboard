import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiHandler, badRequest } from "@/lib/api";
import { prisma } from "@/lib/db";
import { listTargets, targetDTO } from "@/lib/records";
import { parseTargetInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return apiHandler(async () => NextResponse.json(await listTargets()));
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const parsed = parseTargetInput(await req.json().catch(() => null));
    if (!parsed.ok) return badRequest(parsed.error);
    try {
      const t = await prisma.target.create({ data: parsed.data });
      return NextResponse.json(targetDTO(t), { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "A target for this metric, channel and month already exists. Edit it instead." }, { status: 409 });
      }
      throw err;
    }
  });
}
