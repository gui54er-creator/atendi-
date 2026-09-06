import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations/transaction";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const { ctx, error } = await requireWorkplaceApiContext("financial:read");
  if (error) return error;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const patientId = url.searchParams.get("patientId");
  const categoryId = url.searchParams.get("categoryId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const workplaceId = url.searchParams.get("workplaceId") || ctx.workplaceId;

  const where: Prisma.TransactionWhereInput = {
    companyId: ctx.companyId,
    deletedAt: null,
    ...(workplaceId ? { workplaceId } : {}),
  };

  if (type) where.type = type as Prisma.EnumTransactionTypeFilter["equals"];
  if (status) where.status = status as Prisma.EnumTransactionStatusFilter["equals"];
  if (patientId) where.patientId = patientId;
  if (categoryId) where.categoryId = categoryId;
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      patient: { select: { id: true, fullName: true } },
      workplace: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ transactions });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireWorkplaceApiContext("financial:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const workplaceId = (body as { workplaceId?: string })?.workplaceId || ctx.workplaceId;

  if (!workplaceId) {
    return NextResponse.json({ error: "Selecione um local de trabalho." }, { status: 422 });
  }

  const workplace = await prisma.workplace.findFirst({
    where: { id: workplaceId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!workplace) return NextResponse.json({ error: "Local de trabalho inválido." }, { status: 404 });

  const transaction = await prisma.transaction.create({
    data: {
      companyId: ctx.companyId,
      workplaceId,
      type: data.type,
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      categoryId: data.categoryId || null,
      patientId: data.patientId || null,
      appointmentId: data.appointmentId || null,
      paymentMethod: data.paymentMethod || null,
      status: data.status,
      isRecurring: data.isRecurring,
      notes: data.notes || null,
      createdById: ctx.user.id,
    },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "transaction.created",
    entityType: "Transaction",
    entityId: transaction.id,
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
