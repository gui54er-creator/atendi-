import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { workplaceSchema } from "@/lib/validations/workplace";
import { logAudit } from "@/lib/audit";

async function findOrNull(companyId: string, id: string) {
  return prisma.workplace.findFirst({ where: { id, companyId, deletedAt: null } });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("company:manage");
  if (error) return error;

  const existing = await findOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Local não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = workplaceSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });

  const data = parsed.data;

  const updated = await prisma.workplace.update({
    where: { id: existing.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type || null } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.cep !== undefined ? { cep: data.cep || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.number !== undefined ? { number: data.number || null } : {}),
      ...(data.complement !== undefined ? { complement: data.complement || null } : {}),
      ...(data.neighborhood !== undefined ? { neighborhood: data.neighborhood || null } : {}),
      ...(data.city !== undefined ? { city: data.city || null } : {}),
      ...(data.state !== undefined ? { state: data.state || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "settings.updated",
    entityType: "Workplace",
    entityId: updated.id,
  });

  return NextResponse.json({ workplace: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("company:manage");
  if (error) return error;

  const existing = await findOrNull(ctx.companyId, params.id);
  if (!existing) return NextResponse.json({ error: "Local não encontrado." }, { status: 404 });

  const totalActive = await prisma.workplace.count({ where: { companyId: ctx.companyId, deletedAt: null } });
  if (totalActive <= 1) {
    return NextResponse.json(
      { error: "A empresa precisa ter ao menos um local de trabalho." },
      { status: 400 }
    );
  }

  await prisma.workplace.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "settings.updated",
    entityType: "Workplace",
    entityId: existing.id,
    metadata: { action: "deleted" },
  });

  return NextResponse.json({ ok: true });
}
