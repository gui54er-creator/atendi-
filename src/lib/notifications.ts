import "server-only";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationInput {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Ponto único de disparo de notificações. Hoje só grava in-app; a estrutura
 * já separa "criar a notificação" de "entregá-la", então plugar um canal
 * futuro (e-mail, WhatsApp, SMS) é adicionar um dispatcher aqui dentro sem
 * mexer em quem chama createNotification() pelo sistema.
 */
export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    },
  });

  // Canais futuros (ainda não implementados nesta versão):
  // await dispatchEmail(notification);
  // await dispatchWhatsApp(notification);
  // await dispatchSms(notification);

  return notification;
}

/** Notifica todos os membros ativos da empresa (ex: novo paciente cadastrado). */
export async function notifyCompany(
  companyId: string,
  input: Omit<CreateNotificationInput, "companyId" | "userId">
) {
  const members = await prisma.companyMember.findMany({
    where: { companyId, status: "ACTIVE" },
    select: { userId: true },
  });

  await prisma.notification.createMany({
    data: members.map((m) => ({
      companyId,
      userId: m.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    })),
  });
}

/**
 * Gera notificações "do dia" (atendimentos de hoje / pagamentos pendentes)
 * de forma idempotente — não há job agendado nesta versão, então isso roda
 * sob demanda quando o dashboard é carregado, checando antes se já foi
 * gerada uma notificação equivalente hoje para não duplicar.
 * Extensão futura: mover para um cron job real (ex: Vercel Cron) que rode
 * uma vez por dia, independente de alguém abrir o dashboard.
 */
export async function ensureDailyNotifications(companyId: string, userId: string) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const alreadyNotifiedToday = await prisma.notification.findFirst({
    where: {
      companyId,
      userId,
      type: "APPOINTMENT_TODAY",
      createdAt: { gte: todayStart },
    },
  });

  if (!alreadyNotifiedToday) {
    const count = await prisma.appointment.count({
      where: {
        companyId,
        professionalId: userId,
        deletedAt: null,
        startsAt: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELED" },
      },
    });
    if (count > 0) {
      await createNotification({
        companyId,
        userId,
        type: "APPOINTMENT_TODAY",
        title: "Atendimentos de hoje",
        message: `Você possui ${count} atendimento${count > 1 ? "s" : ""} hoje.`,
        link: "/agenda",
      });
    }
  }

  const alreadyNotifiedPending = await prisma.notification.findFirst({
    where: { companyId, userId, type: "PAYMENT_PENDING", createdAt: { gte: todayStart } },
  });

  if (!alreadyNotifiedPending) {
    const pendingCount = await prisma.transaction.count({
      where: { companyId, type: "INCOME", status: "PENDING", deletedAt: null },
    });
    if (pendingCount > 0) {
      await createNotification({
        companyId,
        userId,
        type: "PAYMENT_PENDING",
        title: "Pagamentos pendentes",
        message: `${pendingCount} paciente${pendingCount > 1 ? "s" : ""} com pagamento pendente.`,
        link: "/financial",
      });
    }
  }
}
