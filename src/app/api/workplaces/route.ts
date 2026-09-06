import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { workplaceSchema } from "@/lib/validations/workplace";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const { ctx, error } = await requireApiContext();
  if (error) return error;

  const workplaces = await prisma.workplace.findMany({
    where: { companyId: ctx.companyId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ workplaces });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireApiContext("company:manage");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = workplaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const workplace = await prisma.workplace.create({
    data: {
      companyId: ctx.companyId,
      name: data.name,
      type: data.type || null,
      color: data.color || "#6366F1",
      cep: data.cep || null,
      address: data.address || null,
      number: data.number || null,
      complement: data.complement || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      phone: data.phone || null,
      notes: data.notes || null,
    },
  });

  let imported = 0;
  if (data.importFromWorkplaceId && data.importPatientIds && data.importPatientIds.length > 0) {
    const sourceLinks = await prisma.patientWorkplace.findMany({
      where: {
        workplaceId: data.importFromWorkplaceId,
        patientId: { in: data.importPatientIds },
        patient: { companyId: ctx.companyId },
      },
      select: { patientId: true },
    });

    if (sourceLinks.length > 0) {
      const result = await prisma.patientWorkplace.createMany({
        data: sourceLinks.map((l) => ({ patientId: l.patientId, workplaceId: workplace.id })),
        skipDuplicates: true,
      });
      imported = result.count;
    }
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "settings.updated",
    entityType: "Workplace",
    entityId: workplace.id,
    metadata: { action: "created", imported },
  });

  return NextResponse.json({ workplace, imported }, { status: 201 });
}
