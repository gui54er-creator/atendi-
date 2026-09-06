import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const customFieldSchema = z.object({
  label: z.string().trim().min(2, "Informe um nome para o campo."),
  type: z.enum(["TEXT", "TEXTAREA", "NUMBER", "DATE", "BOOLEAN", "SELECT"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
});

export async function GET() {
  const { ctx, error } = await requireApiContext("clinical:read");
  if (error) return error;

  const fields = await prisma.customField.findMany({
    where: { companyId: ctx.companyId, deletedAt: null },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ fields });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireApiContext("clinical:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = customFieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const count = await prisma.customField.count({ where: { companyId: ctx.companyId, deletedAt: null } });

  const field = await prisma.customField.create({
    data: {
      companyId: ctx.companyId,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.type === "SELECT" ? parsed.data.options ?? [] : undefined,
      required: parsed.data.required,
      order: count,
    },
  });

  return NextResponse.json({ field }, { status: 201 });
}
