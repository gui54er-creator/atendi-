import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("clinical:write");
  if (error) return error;

  const field = await prisma.customField.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
  });
  if (!field) {
    return NextResponse.json({ error: "Campo não encontrado." }, { status: 404 });
  }

  await prisma.customField.update({ where: { id: field.id }, data: { deletedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
