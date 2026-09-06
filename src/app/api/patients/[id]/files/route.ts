import { NextResponse } from "next/server";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { savePrivateFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("patients:read");
  if (error) return error;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const url = new URL(req.url);
  const workplaceId = url.searchParams.get("workplaceId") || ctx.workplaceId;

  const files = await prisma.patientFile.findMany({
    where: {
      patientId: patient.id,
      companyId: ctx.companyId,
      deletedAt: null,
      ...(workplaceId ? { workplaceId } : {}),
    },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ files });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("patients:write");
  if (error) return error;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const description = formData?.get("description");
  const appointmentId = formData?.get("appointmentId");
  const bodyWorkplaceId = formData?.get("workplaceId");
  const workplaceId =
    (typeof bodyWorkplaceId === "string" && bodyWorkplaceId) || ctx.workplaceId;

  if (!workplaceId) {
    return NextResponse.json({ error: "Selecione um local de trabalho." }, { status: 422 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let storageKey: string;
  try {
    const result = await savePrivateFile(buffer, file.type, `patients/${patient.id}`);
    storageKey = result.storageKey;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const record = await prisma.patientFile.create({
    data: {
      companyId: ctx.companyId,
      patientId: patient.id,
      workplaceId,
      appointmentId: typeof appointmentId === "string" && appointmentId ? appointmentId : null,
      uploadedById: ctx.user.id,
      storageKey,
      filename: file.name,
      mimeType: file.type,
      size: buffer.byteLength,
      description: typeof description === "string" ? description : null,
    },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "file.added",
    entityType: "PatientFile",
    entityId: record.id,
  });

  return NextResponse.json({ file: record }, { status: 201 });
}
