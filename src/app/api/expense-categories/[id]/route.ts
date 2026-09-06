import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("financial:write");
  if (error) return error;

  const category = await prisma.expenseCategory.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
  });
  if (!category) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

  await prisma.expenseCategory.update({ where: { id: category.id }, data: { deletedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
