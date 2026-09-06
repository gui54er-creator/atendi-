import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { ctx, error } = await requireApiContext("financial:read");
  if (error) return error;

  const type = new URL(req.url).searchParams.get("type");

  const categories = await prisma.expenseCategory.findMany({
    where: { companyId: ctx.companyId, deletedAt: null, ...(type ? { type: type as any } : {}) },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

const schema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export async function POST(req: Request) {
  const { ctx, error } = await requireApiContext("financial:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const category = await prisma.expenseCategory.create({
    data: { companyId: ctx.companyId, name: parsed.data.name, type: parsed.data.type },
  });

  return NextResponse.json({ category }, { status: 201 });
}
