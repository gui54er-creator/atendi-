import { NextResponse } from "next/server";
import { Prisma, type PatientStatus } from "@prisma/client";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { patientSchema } from "@/lib/validations/patient";
import { logAudit } from "@/lib/audit";
import { notifyCompany } from "@/lib/notifications";
import { onlyDigits } from "@/lib/utils";

const PAGE_SIZE_DEFAULT = 10;

export async function GET(req: Request) {
  const { ctx, error } = await requireWorkplaceApiContext("patients:read");
  if (error) return error;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") as PatientStatus | null;
  const minAge = url.searchParams.get("minAge");
  const maxAge = url.searchParams.get("maxAge");
  const sortBy = url.searchParams.get("sortBy") ?? "fullName";
  const sortDir = url.searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? PAGE_SIZE_DEFAULT));
  // "all" força visão consolidada mesmo com um local específico ativo
  // (usado pela busca de origem no fluxo de importar pacientes).
  const workplaceParam = url.searchParams.get("workplaceId");
  const effectiveWorkplaceId = workplaceParam === "all" ? null : workplaceParam || ctx.workplaceId;

  const where: Prisma.PatientWhereInput = {
    companyId: ctx.companyId,
    deletedAt: null,
    workplaces: effectiveWorkplaceId
      ? { some: { workplaceId: effectiveWorkplaceId, ...(status ? { status } : {}) } }
      : status
        ? { some: { status } }
        : { some: {} },
  };

  if (q) {
    const digits = onlyDigits(q);
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { whatsapp: { contains: q } },
      ...(digits.length >= 3 ? [{ cpf: { contains: digits } }] : []),
    ];
  }

  const now = new Date();
  if (maxAge) {
    const minBirthDate = new Date(now.getFullYear() - Number(maxAge) - 1, now.getMonth(), now.getDate());
    where.birthDate = { ...(where.birthDate as object), gte: minBirthDate };
  }
  if (minAge) {
    const maxBirthDate = new Date(now.getFullYear() - Number(minAge), now.getMonth(), now.getDate());
    where.birthDate = { ...(where.birthDate as object), lte: maxBirthDate };
  }

  const sortableFields = new Set(["fullName", "birthDate", "createdAt"]);
  const orderBy: Prisma.PatientOrderByWithRelationInput = sortableFields.has(sortBy)
    ? { [sortBy]: sortDir }
    : { fullName: "asc" };

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        photoUrl: true,
        fullName: true,
        birthDate: true,
        phone: true,
        whatsapp: true,
        workplaces: {
          where: effectiveWorkplaceId ? { workplaceId: effectiveWorkplaceId } : undefined,
          select: {
            status: true,
            workplace: { select: { id: true, name: true, color: true } },
          },
        },
      },
    }),
  ]);

  const patientIds = patients.map((p) => p.id);
  const apptWhere = effectiveWorkplaceId ? { workplaceId: effectiveWorkplaceId } : {};

  const [lastAppointments, nextAppointments] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["patientId"],
      where: { patientId: { in: patientIds }, deletedAt: null, startsAt: { lte: now }, ...apptWhere },
      _max: { startsAt: true },
    }),
    prisma.appointment.groupBy({
      by: ["patientId"],
      where: {
        patientId: { in: patientIds },
        deletedAt: null,
        startsAt: { gt: now },
        status: { notIn: ["CANCELED"] },
        ...apptWhere,
      },
      _min: { startsAt: true },
    }),
  ]);

  const lastByPatient = new Map(lastAppointments.map((a) => [a.patientId, a._max.startsAt]));
  const nextByPatient = new Map(nextAppointments.map((a) => [a.patientId, a._min.startsAt]));

  const items = patients.map((p) => ({
    id: p.id,
    photoUrl: p.photoUrl,
    fullName: p.fullName,
    birthDate: p.birthDate,
    phone: p.phone,
    whatsapp: p.whatsapp,
    status: p.workplaces[0]?.status ?? null,
    workplaces: p.workplaces.map((w) => ({ id: w.workplace.id, name: w.workplace.name, color: w.workplace.color })),
    lastAppointment: lastByPatient.get(p.id) ?? null,
    nextAppointment: nextByPatient.get(p.id) ?? null,
  }));

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireWorkplaceApiContext("patients:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = patientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const requestedWorkplaceId = (body as { workplaceId?: string })?.workplaceId ?? ctx.workplaceId;

  if (!requestedWorkplaceId) {
    return NextResponse.json(
      { error: "Selecione um local de trabalho para cadastrar o paciente." },
      { status: 422 }
    );
  }

  const workplace = await prisma.workplace.findFirst({
    where: { id: requestedWorkplaceId, companyId: ctx.companyId, deletedAt: null },
  });
  if (!workplace) {
    return NextResponse.json({ error: "Local de trabalho inválido." }, { status: 404 });
  }

  // Evita duplicar a identidade da pessoa: se já existe um paciente com o
  // mesmo CPF nesta empresa (em outro local), sugerimos importar em vez de
  // criar um cadastro novo e desconectado.
  if (data.cpf) {
    const cpfDigits = onlyDigits(data.cpf);
    const existing = await prisma.patient.findFirst({
      where: { companyId: ctx.companyId, cpf: cpfDigits, deletedAt: null },
      select: { id: true, fullName: true, workplaces: { select: { workplaceId: true } } },
    });
    if (existing) {
      const alreadyHere = existing.workplaces.some((w) => w.workplaceId === workplace.id);
      if (!alreadyHere) {
        return NextResponse.json(
          {
            error: `Já existe um paciente com este CPF: ${existing.fullName}.`,
            suggestImport: {
              patientId: existing.id,
              fullName: existing.fullName,
              sourceWorkplaceId: existing.workplaces[0]?.workplaceId ?? null,
            },
          },
          { status: 409 }
        );
      }
    }
  }

  const patient = await prisma.$transaction(async (tx) => {
    const created = await tx.patient.create({
      data: {
        companyId: ctx.companyId,
        createdById: ctx.user.id,
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
        guardians:
          data.guardians.length > 0
            ? {
                create: data.guardians.map((g) => ({
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
              }
            : undefined,
      },
    });

    const link = await tx.patientWorkplace.create({
      data: {
        patientId: created.id,
        workplaceId: workplace.id,
        status: data.status,
        howFoundUs: data.howFoundUs || null,
        joinedAt: data.firstVisitDate ? new Date(`${data.firstVisitDate}T00:00:00`) : new Date(),
        record: {
          create: {
            mainComplaint: data.record?.mainComplaint || null,
            reasonForVisit: data.record?.reasonForVisit || null,
            history: data.record?.history || null,
            pastHistory: data.record?.pastHistory || null,
            medications: data.record?.medications || null,
            allergies: data.record?.allergies || null,
            previousTreatments: data.record?.previousTreatments || null,
            importantNotes: data.record?.importantNotes || null,
            goals: data.record?.goals || null,
          },
        },
      },
    });

    if (data.customFieldValues) {
      const entries = Object.entries(data.customFieldValues).filter(([, v]) => v !== undefined);
      if (entries.length > 0) {
        await tx.customFieldValue.createMany({
          data: entries.map(([customFieldId, value]) => ({
            customFieldId,
            patientWorkplaceId: link.id,
            value,
          })),
        });
      }
    }

    return created;
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "patient.created",
    entityType: "Patient",
    entityId: patient.id,
  });

  await notifyCompany(ctx.companyId, {
    type: "NEW_PATIENT",
    title: "Novo paciente cadastrado",
    message: `${patient.fullName} foi adicionado(a) aos pacientes.`,
    link: `/patients/${patient.id}`,
  });

  return NextResponse.json({ patient }, { status: 201 });
}
