import { NextResponse } from "next/server";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/utils";

export async function GET(req: Request) {
  const { ctx, error } = await requireWorkplaceApiContext();
  if (error) return error;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ patients: [], appointments: [] });
  }

  const digits = onlyDigits(q);

  const patients = await prisma.patient.findMany({
    where: {
      companyId: ctx.companyId,
      deletedAt: null,
      workplaces: ctx.workplaceId ? { some: { workplaceId: ctx.workplaceId } } : undefined,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { whatsapp: { contains: q } },
        ...(digits.length >= 3 ? [{ cpf: { contains: digits } }] : []),
      ],
    },
    select: { id: true, fullName: true, photoUrl: true, phone: true },
    take: 6,
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      companyId: ctx.companyId,
      deletedAt: null,
      ...(ctx.workplaceId ? { workplaceId: ctx.workplaceId } : {}),
      patient: { fullName: { contains: q, mode: "insensitive" } },
    },
    select: {
      id: true,
      startsAt: true,
      type: true,
      status: true,
      patient: { select: { fullName: true } },
    },
    orderBy: { startsAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ patients, appointments });
}
