import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const recordSchema = z.object({
  workplaceId: z.string().optional(),
  mainComplaint: z.string().trim().optional().or(z.literal("")),
  reasonForVisit: z.string().trim().optional().or(z.literal("")),
  history: z.string().trim().optional().or(z.literal("")),
  pastHistory: z.string().trim().optional().or(z.literal("")),
  medications: z.string().trim().optional().or(z.literal("")),
  allergies: z.string().trim().optional().or(z.literal("")),
  previousTreatments: z.string().trim().optional().or(z.literal("")),
  importantNotes: z.string().trim().optional().or(z.literal("")),
  goals: z.string().trim().optional().or(z.literal("")),
  customFieldValues: z.record(z.string(), z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("clinical:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { customFieldValues, workplaceId: bodyWorkplaceId, ...record } = parsed.data;
  const workplaceId = bodyWorkplaceId || ctx.workplaceId;

  const link = workplaceId
    ? await prisma.patientWorkplace.findFirst({
        where: { patientId: params.id, workplaceId, patient: { companyId: ctx.companyId } },
      })
    : null;

  if (!link) {
    return NextResponse.json(
      { error: "Este paciente não está vinculado ao local de trabalho ativo." },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.patientRecord.upsert({
      where: { patientWorkplaceId: link.id },
      create: { patientWorkplaceId: link.id, ...record },
      update: record,
    });

    if (customFieldValues) {
      for (const [customFieldId, value] of Object.entries(customFieldValues)) {
        await tx.customFieldValue.upsert({
          where: { customFieldId_patientWorkplaceId: { customFieldId, patientWorkplaceId: link.id } },
          create: { customFieldId, patientWorkplaceId: link.id, value },
          update: { value },
        });
      }
    }
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "patient.record_updated",
    entityType: "PatientRecord",
    entityId: params.id,
  });

  return NextResponse.json({ ok: true });
}
