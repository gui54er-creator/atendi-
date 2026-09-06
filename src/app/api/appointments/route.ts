import { NextResponse } from "next/server";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { appointmentCreateSchema } from "@/lib/validations/appointment";
import { logAudit } from "@/lib/audit";
import { detectConflict } from "@/lib/scheduling/conflicts";
import { generateOccurrences } from "@/lib/scheduling/recurrence";
import { notifyCompany } from "@/lib/notifications";

export async function GET(req: Request) {
  const { ctx, error } = await requireWorkplaceApiContext("agenda:read");
  if (error) return error;

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const workplaceId = url.searchParams.get("workplaceId") || ctx.workplaceId;

  const appointments = await prisma.appointment.findMany({
    where: {
      companyId: ctx.companyId,
      deletedAt: null,
      ...(workplaceId ? { workplaceId } : {}),
      ...(start || end
        ? {
            startsAt: {
              ...(start ? { gte: new Date(start) } : {}),
              ...(end ? { lte: new Date(end) } : {}),
            },
          }
        : {}),
    },
    include: {
      patient: { select: { id: true, fullName: true, photoUrl: true } },
      professional: { select: { id: true, name: true } },
      workplace: { select: { id: true, name: true, color: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({ appointments });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireWorkplaceApiContext("agenda:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = appointmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const [patientLink, professional, workplace] = await Promise.all([
    prisma.patientWorkplace.findFirst({
      where: { patientId: data.patientId, workplaceId: data.workplaceId, patient: { companyId: ctx.companyId } },
      include: { patient: { select: { fullName: true } } },
    }),
    prisma.companyMember.findFirst({
      where: { userId: data.professionalId, companyId: ctx.companyId, status: "ACTIVE" },
    }),
    prisma.workplace.findFirst({ where: { id: data.workplaceId, companyId: ctx.companyId, deletedAt: null } }),
  ]);

  if (!workplace) return NextResponse.json({ error: "Local de trabalho inválido." }, { status: 404 });
  if (!patientLink) {
    return NextResponse.json(
      { error: "Este paciente não está vinculado ao local de trabalho selecionado." },
      { status: 404 }
    );
  }
  if (!professional) return NextResponse.json({ error: "Profissional inválido." }, { status: 404 });

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(startsAt.getTime() + data.durationMinutes * 60_000);

  // -------- Atendimento único (sem recorrência) --------
  if (!data.recurrence) {
    const conflict = await detectConflict({
      companyId: ctx.companyId,
      professionalId: data.professionalId,
      startsAt,
      endsAt,
    });
    if (conflict && !data.overrideConflict) {
      return NextResponse.json(
        { error: "Já existe um atendimento neste horário.", conflict },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        companyId: ctx.companyId,
        workplaceId: data.workplaceId,
        patientId: data.patientId,
        professionalId: data.professionalId,
        startsAt,
        endsAt,
        type: data.type,
        value: data.value ?? null,
        notes: data.notes || null,
      },
    });

    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      action: "appointment.created",
      entityType: "Appointment",
      entityId: appointment.id,
    });

    await notifyCompany(ctx.companyId, {
      type: "APPOINTMENT_TODAY",
      title: "Novo agendamento",
      message: `${patientLink.patient.fullName} agendado(a) para ${startsAt.toLocaleDateString("pt-BR")}.`,
      link: `/agenda`,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  }

  // -------- Série recorrente --------
  const occurrences = generateOccurrences({
    frequency: data.recurrence.frequency,
    interval: data.recurrence.interval,
    daysOfWeek: data.recurrence.daysOfWeek,
    startTime: startsAt.toTimeString().slice(0, 5),
    durationMinutes: data.durationMinutes,
    startDate: startsAt,
    endDate: data.recurrence.endDate ? new Date(data.recurrence.endDate) : null,
    indefinite: data.recurrence.indefinite,
  });

  const conflicts: { startsAt: Date; endsAt: Date }[] = [];
  const clear: { startsAt: Date; endsAt: Date }[] = [];

  for (const occ of occurrences) {
    const conflict = await detectConflict({
      companyId: ctx.companyId,
      professionalId: data.professionalId,
      startsAt: occ.startsAt,
      endsAt: occ.endsAt,
    });
    if (conflict) conflicts.push(occ);
    else clear.push(occ);
  }

  if (conflicts.length > 0 && !data.overrideConflict) {
    return NextResponse.json(
      {
        error: `${conflicts.length} data(s) da recorrência têm conflito de horário.`,
        conflicts: conflicts.map((c) => c.startsAt),
        totalOccurrences: occurrences.length,
      },
      { status: 409 }
    );
  }

  const toCreate = data.overrideConflict ? clear : occurrences;

  const series = await prisma.appointmentSeries.create({
    data: {
      companyId: ctx.companyId,
      workplaceId: data.workplaceId,
      patientId: data.patientId,
      professionalId: data.professionalId,
      frequency: data.recurrence.frequency,
      interval: data.recurrence.interval,
      daysOfWeek: data.recurrence.daysOfWeek,
      startTime: startsAt.toTimeString().slice(0, 5),
      durationMinutes: data.durationMinutes,
      type: data.type,
      value: data.value ?? null,
      notes: data.notes || null,
      startDate: startsAt,
      endDate: data.recurrence.endDate ? new Date(data.recurrence.endDate) : null,
      indefinite: data.recurrence.indefinite,
    },
  });

  await prisma.appointment.createMany({
    data: toCreate.map((occ) => ({
      companyId: ctx.companyId,
      workplaceId: data.workplaceId,
      patientId: data.patientId,
      professionalId: data.professionalId,
      seriesId: series.id,
      startsAt: occ.startsAt,
      endsAt: occ.endsAt,
      type: data.type,
      value: data.value ?? null,
      notes: data.notes || null,
    })),
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "appointment.created",
    entityType: "AppointmentSeries",
    entityId: series.id,
    metadata: { occurrences: toCreate.length, skipped: conflicts.length },
  });

  return NextResponse.json(
    { series, created: toCreate.length, skippedConflicts: conflicts.length },
    { status: 201 }
  );
}
