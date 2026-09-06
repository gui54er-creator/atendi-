import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations/transaction";
import { logAudit } from "@/lib/audit";

async function findOrNull(companyId: string, id: string) {
  return prisma.transaction.findFirst({ where: { id, companyId, deletedAt: null } });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("financial:write");
  if (error) return error;

  const existing = await findOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = transactionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const data = parsed.data;

  const updated = await prisma.transaction.update({
    where: { id: existing.id },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
      ...(data.patientId !== undefined ? { patientId: data.patientId || null } : {}),
      ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.isRecurring !== undefined ? { isRecurring: data.isRecurring } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "transaction.updated",
    entityType: "Transaction",
    entityId: updated.id,
  });

  return NextResponse.json({ transaction: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("financial:write");
  if (error) return error;

  const existing = await findOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });

  await prisma.transaction.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "transaction.deleted",
    entityType: "Transaction",
    entityId: existing.id,
  });

  return NextResponse.json({ ok: true });
}
