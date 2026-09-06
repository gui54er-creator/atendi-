import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { appointmentNoteSchema } from "@/lib/validations/appointment";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("clinical:write");
  if (error) return error;

  const appointment = await prisma.appointment.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!appointment) return NextResponse.json({ error: "Atendimento não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = appointmentNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Escreva uma anotação válida." }, { status: 422 });
  }

  const note = await prisma.appointmentNote.create({
    data: { appointmentId: appointment.id, authorId: ctx.user.id, content: parsed.data.content },
    include: { author: { select: { name: true } } },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "appointment.note_added",
    entityType: "AppointmentNote",
    entityId: note.id,
  });

  return NextResponse.json({ note }, { status: 201 });
}
