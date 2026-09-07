import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const topicCreateSchema = z.object({
  workplaceId: z.string().optional(),
  title: z.string().trim().min(1, "Informe um título para o tópico.").max(120),
  content: z.string().trim().optional().or(z.literal("")),
});

async function resolveLink(patientId: string, workplaceId: string | null, companyId: string) {
  if (!workplaceId) return null;
  return prisma.patientWorkplace.findFirst({
    where: { patientId, workplaceId, patient: { companyId } },
  });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("clinical:read");
  if (error) return error;

  const url = new URL(req.url);
  const workplaceId = url.searchParams.get("workplaceId") || ctx.workplaceId;

  const link = await resolveLink(params.id, workplaceId, ctx.companyId);
  if (!link) {
    return NextResponse.json(
      { error: "Este paciente não está vinculado ao local de trabalho ativo." },
      { status: 404 }
    );
  }

  const topics = await prisma.patientRecordTopic.findMany({
    where: { patientWorkplaceId: link.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ topics });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireWorkplaceApiContext("clinical:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = topicCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { workplaceId: bodyWorkplaceId, title, content } = parsed.data;
  const workplaceId = bodyWorkplaceId || ctx.workplaceId;

  const link = await resolveLink(params.id, workplaceId, ctx.companyId);
  if (!link) {
    return NextResponse.json(
      { error: "Este paciente não está vinculado ao local de trabalho ativo." },
      { status: 404 }
    );
  }

  const last = await prisma.patientRecordTopic.aggregate({
    where: { patientWorkplaceId: link.id },
    _max: { order: true },
  });

  const topic = await prisma.patientRecordTopic.create({
    data: {
      patientWorkplaceId: link.id,
      title,
      content: content || null,
      order: (last._max.order ?? -1) + 1,
    },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "patient.record_topic_created",
    entityType: "PatientRecordTopic",
    entityId: topic.id,
  });

  return NextResponse.json({ topic }, { status: 201 });
}
