import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { appointmentUpdateSchema } from "@/lib/validations/appointment";
import { logAudit } from "@/lib/audit";
import { detectConflict } from "@/lib/scheduling/conflicts";

async function findAppointmentOrNull(companyId: string, id: string) {
  return prisma.appointment.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      patient: { select: { id: true, fullName: true, photoUrl: true } },
      professional: { select: { id: true, name: true } },
      appointmentNotes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      transactions: true,
      files: true,
      series: true,
    },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("agenda:read");
  if (error) return error;

  const appointment = await findAppointmentOrNull(ctx.companyId, params.id);
  if (!appointment) return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });

  return NextResponse.json({ appointment });
}

// scope só é relevante quando o atendimento pertence a uma série recorrente:
// "this" (padrão) afeta só este registro; "following" afeta este e os
// futuros da mesma série; "all" afeta todos os registros da série.
type EditScope = "this" | "following" | "all";

function getScope(req: Request): EditScope {
  const scope = new URL(req.url).searchParams.get("scope");
  return scope === "following" || scope === "all" ? scope : "this";
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("agenda:write");
  if (error) return error;

  const existing = await findAppointmentOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = appointmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const scope = existing.seriesId ? getScope(req) : "this";
  const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
  const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt;

  if ((data.startsAt || data.endsAt) && scope === "this") {
    const conflict = await detectConflict({
      companyId: ctx.companyId,
      professionalId: existing.professionalId,
      startsAt,
      endsAt,
      excludeAppointmentId: existing.id,
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Já existe um atendimento neste horário.", conflict },
        { status: 409 }
      );
    }
  }

  // Data/horário só fazem sentido alterar num registro por vez (drag & drop);
  // "following"/"all" aplicam apenas os demais campos (tipo, valor, status,
  // observações) a todo o grupo de ocorrências.
  const sharedFieldsData = {
    ...(data.type !== undefined ? { type: data.type } : {}),
    ...(data.value !== undefined ? { value: data.value } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
  };

  if (scope === "this") {
    await prisma.appointment.update({
      where: { id: existing.id },
      data: { startsAt, endsAt, ...sharedFieldsData },
    });
  } else {
    const where =
      scope === "following"
        ? { seriesId: existing.seriesId!, deletedAt: null, startsAt: { gte: existing.startsAt } }
        : { seriesId: existing.seriesId!, deletedAt: null };
    await prisma.appointment.updateMany({ where, data: sharedFieldsData });
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "appointment.updated",
    entityType: "Appointment",
    entityId: existing.id,
    metadata: { scope },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("agenda:write");
  if (error) return error;

  const existing = await findAppointmentOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });

  const scope = existing.seriesId ? getScope(req) : "this";

  if (scope === "this") {
    await prisma.appointment.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  } else {
    const where =
      scope === "following"
        ? { seriesId: existing.seriesId!, deletedAt: null, startsAt: { gte: existing.startsAt } }
        : { seriesId: existing.seriesId!, deletedAt: null };
    await prisma.appointment.updateMany({ where, data: { deletedAt: new Date() } });
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "appointment.deleted",
    entityType: "Appointment",
    entityId: existing.id,
    metadata: { scope },
  });

  return NextResponse.json({ ok: true });
}
