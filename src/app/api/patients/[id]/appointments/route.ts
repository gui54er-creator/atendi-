import { NextResponse } from "next/server";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("agenda:read");
  if (error) return error;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const url = new URL(req.url);
  const workplaceId = url.searchParams.get("workplaceId") || ctx.workplaceId;

  const appointments = await prisma.appointment.findMany({
    where: {
      patientId: patient.id,
      companyId: ctx.companyId,
      deletedAt: null,
      ...(workplaceId ? { workplaceId } : {}),
    },
    include: {
      professional: { select: { name: true } },
      workplace: { select: { id: true, name: true, color: true } },
      appointmentNotes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      transactions: true,
      _count: { select: { files: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({ appointments });
}
