import { NextResponse } from "next/server";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validations/patient";
import { logAudit } from "@/lib/audit";
import { onlyDigits } from "@/lib/utils";

async function findPatientOrNull(companyId: string, id: string) {
  return prisma.patient.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      guardians: true,
      workplaces: {
        include: { workplace: { select: { id: true, name: true, color: true } }, record: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

function resolveWorkplaceId(req: Request, fallback: string | null): string | null {
  const url = new URL(req.url);
  return url.searchParams.get("workplaceId") || fallback;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("patients:read");
  if (error) return error;

  const patient = await findPatientOrNull(ctx.companyId, params.id);
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const workplaceId = resolveWorkplaceId(req, ctx.workplaceId ?? patient.workplaces[0]?.workplaceId ?? null);
  const activeLink = patient.workplaces.find((w) => w.workplaceId === workplaceId) ?? patient.workplaces[0];

  return NextResponse.json({
    patient: { ...patient, guardians: patient.guardians },
    activeWorkplace: activeLink
      ? {
          patientWorkplaceId: activeLink.id,
          workplaceId: activeLink.workplaceId,
          workplaceName: activeLink.workplace.name,
          workplaceColor: activeLink.workplace.color,
          status: activeLink.status,
          howFoundUs: activeLink.howFoundUs,
          joinedAt: activeLink.joinedAt,
          notes: activeLink.notes,
          record: activeLink.record,
        }
      : null,
    allWorkplaces: patient.workplaces.map((w) => ({
      patientWorkplaceId: w.id,
      workplaceId: w.workplaceId,
      workplaceName: w.workplace.name,
      workplaceColor: w.workplace.color,
      status: w.status,
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("patients:write");
  if (error) return error;

  const existing = await findPatientOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const workplaceId = resolveWorkplaceId(req, ctx.workplaceId ?? existing.workplaces[0]?.workplaceId ?? null);
  const link = existing.workplaces.find((w) => w.workplaceId === workplaceId);

  await prisma.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: existing.id },
      data: {
        photoUrl: data.photoUrl || null,
        fullName: data.fullName,
        socialName: data.socialName || null,
        cpf: data.cpf ? onlyDigits(data.cpf) : null,
        rg: data.rg || null,
        birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00`) : null,
        sex: data.sex,
        gender: data.gender || null,
        maritalStatus: data.maritalStatus || null,
        profession: data.profession || null,
        education: data.education || null,
        nationality: data.nationality || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        cep: data.cep || null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        generalNotes: data.generalNotes || null,
      },
    });

    if (link) {
      await tx.patientWorkplace.update({
        where: { id: link.id },
        data: {
          status: data.status,
          howFoundUs: data.howFoundUs || null,
          joinedAt: data.firstVisitDate ? new Date(`${data.firstVisitDate}T00:00:00`) : link.joinedAt,
        },
      });
    }

    // Substitui os responsáveis pelo conjunto enviado.
    await tx.guardian.deleteMany({ where: { patientId: existing.id } });
    if (data.guardians.length > 0) {
      await tx.guardian.createMany({
        data: data.guardians.map((g) => ({
          patientId: existing.id,
          fullName: g.fullName,
          relationship: g.relationship,
          cpf: g.cpf ? onlyDigits(g.cpf) : null,
          phone: g.phone || null,
          whatsapp: g.whatsapp || null,
          email: g.email || null,
          cep: g.cep || null,
          address: g.address || null,
          number: g.number || null,
          complement: g.complement || null,
          neighborhood: g.neighborhood || null,
          city: g.city || null,
          state: g.state || null,
        })),
      });
    }
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "patient.updated",
    entityType: "Patient",
    entityId: existing.id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("patients:delete");
  if (error) return error;

  const existing = await findPatientOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const workplaceId = resolveWorkplaceId(req, ctx.workplaceId ?? existing.workplaces[0]?.workplaceId ?? null);
  const link = existing.workplaces.find((w) => w.workplaceId === workplaceId);

  if (link) {
    await prisma.patientWorkplace.delete({ where: { id: link.id } });
  }

  const remaining = existing.workplaces.length - (link ? 1 : 0);
  if (remaining <= 0) {
    await prisma.patient.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  }

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "patient.deleted",
    entityType: "Patient",
    entityId: existing.id,
    metadata: { workplaceId, fullyDeleted: remaining <= 0 },
  });

  return NextResponse.json({ ok: true, fullyDeleted: remaining <= 0 });
}
