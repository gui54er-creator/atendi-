import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validations/appointment";
import { logAudit } from "@/lib/audit";

// Registrar o pagamento de um atendimento cria/atualiza a Transaction (receita)
// vinculada a ele — é a mesma fonte de dados usada pelo módulo Financeiro,
// então tudo aparece automaticamente no dashboard e nos relatórios.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("financial:write");
  if (error) return error;

  const appointment = await prisma.appointment.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
    include: { transactions: true },
  });
  if (!appointment) return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de pagamento inválidos." }, { status: 422 });
  }

  const existingTransaction = appointment.transactions[0];

  const transaction = existingTransaction
    ? await prisma.transaction.update({
        where: { id: existingTransaction.id },
        data: {
          amount: parsed.data.amount,
          status: parsed.data.status,
          paymentMethod: parsed.data.paymentMethod,
        },
      })
    : await prisma.transaction.create({
        data: {
          companyId: ctx.companyId,
          workplaceId: appointment.workplaceId,
          type: "INCOME",
          description: `Atendimento — ${appointment.type}`,
          amount: parsed.data.amount,
          date: appointment.startsAt,
          status: parsed.data.status,
          paymentMethod: parsed.data.paymentMethod,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          createdById: ctx.user.id,
        },
      });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: existingTransaction ? "transaction.updated" : "transaction.created",
    entityType: "Transaction",
    entityId: transaction.id,
  });

  return NextResponse.json({ transaction });
}
