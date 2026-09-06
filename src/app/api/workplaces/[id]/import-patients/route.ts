import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { importPatientsSchema } from "@/lib/validations/workplace";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("patients:write");
  if (error) return error;

  const targetWorkplace = await prisma.workplace.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
  });
  if (!targetWorkplace) return NextResponse.json({ error: "Local não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = importPatientsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Selecione ao menos um paciente." }, { status: 422 });
  }

  const sourceLinks = await prisma.patientWorkplace.findMany({
    where: {
      workplaceId: parsed.data.sourceWorkplaceId,
      patientId: { in: parsed.data.patientIds },
      patient: { companyId: ctx.companyId },
    },
    include: { patient: { select: { fullName: true } } },
  });

  const existingInTarget = await prisma.patientWorkplace.findMany({
    where: { workplaceId: targetWorkplace.id, patientId: { in: sourceLinks.map((l) => l.patientId) } },
    select: { patientId: true },
  });
  const alreadyLinkedIds = new Set(existingInTarget.map((l) => l.patientId));

  const toCreate = sourceLinks.filter((l) => !alreadyLinkedIds.has(l.patientId));

  if (toCreate.length > 0) {
    await prisma.patientWorkplace.createMany({
      data: toCreate.map((l) => ({ patientId: l.patientId, workplaceId: targetWorkplace.id })),
      skipDuplicates: true,
    });

    await logAudit({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      action: "patient.updated",
      entityType: "Workplace",
      entityId: targetWorkplace.id,
      metadata: { action: "patients_imported", count: toCreate.length },
    });
  }

  return NextResponse.json({
    imported: toCreate.length,
    alreadyLinked: sourceLinks.filter((l) => alreadyLinkedIds.has(l.patientId)).map((l) => l.patient.fullName),
  });
}
