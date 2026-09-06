import "server-only";
import { prisma } from "@/lib/prisma";

interface DetectConflictParams {
  companyId: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  excludeAppointmentId?: string;
}

/**
 * Um atendimento conflita com outro do MESMO profissional quando os
 * intervalos [startsAt, endsAt) se sobrepõem. Atendimentos cancelados não
 * contam como conflito.
 */
export async function detectConflict(params: DetectConflictParams) {
  const conflict = await prisma.appointment.findFirst({
    where: {
      companyId: params.companyId,
      professionalId: params.professionalId,
      deletedAt: null,
      status: { not: "CANCELED" },
      ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}),
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      patient: { select: { fullName: true } },
    },
  });

  return conflict;
}
