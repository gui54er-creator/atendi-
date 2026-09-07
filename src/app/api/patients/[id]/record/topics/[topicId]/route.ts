import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkplaceApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const topicUpdateSchema = z.object({
  workplaceId: z.string().optional(),
  title: z.string().trim().min(1, "Informe um título para o tópico.").max(120).optional(),
  content: z.string().trim().optional().or(z.literal("")),
});

async function resolveTopic(patientId: string, workplaceId: string | null, companyId: string, topicId: string) {
  if (!workplaceId) return null;
  const link = await prisma.patientWorkplace.findFirst({
    where: { patientId, workplaceId, patient: { companyId } },
  });
  if (!link) return null;

  const topic = await prisma.patientRecordTopic.findFirst({
    where: { id: topicId, patientWorkplaceId: link.id },
  });
  if (!topic) return null;

  return topic;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; topicId: string } }
) {
  const { ctx, error } = await requireWorkplaceApiContext("clinical:write");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = topicUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { workplaceId: bodyWorkplaceId, title, content } = parsed.data;
  const workplaceId = bodyWorkplaceId || ctx.workplaceId;

  const topic = await resolveTopic(params.id, workplaceId, ctx.companyId, params.topicId);
  if (!topic) {
    return NextResponse.json({ error: "Tópico não encontrado." }, { status: 404 });
  }

  const updated = await prisma.patientRecordTopic.update({
    where: { id: topic.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content: content || null } : {}),
    },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "patient.record_topic_updated",
    entityType: "PatientRecordTopic",
    entityId: updated.id,
  });

  return NextResponse.json({ topic: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; topicId: string } }
) {
  const { ctx, error } = await requireWorkplaceApiContext("clinical:write");
  if (error) return error;

  const url = new URL(req.url);
  const workplaceId = url.searchParams.get("workplaceId") || ctx.workplaceId;

  const topic = await resolveTopic(params.id, workplaceId, ctx.companyId, params.topicId);
  if (!topic) {
    return NextResponse.json({ error: "Tópico não encontrado." }, { status: 404 });
  }

  await prisma.patientRecordTopic.delete({ where: { id: topic.id } });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "patient.record_topic_deleted",
    entityType: "PatientRecordTopic",
    entityId: topic.id,
  });

  return NextResponse.json({ ok: true });
}
