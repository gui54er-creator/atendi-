import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "PROFESSIONAL", "RECEPTIONIST"]).optional(),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("users:manage");
  if (error) return error;

  const member = await prisma.companyMember.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  });
  if (!member) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Não é possível alterar o proprietário da empresa." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });

  const updated = await prisma.companyMember.update({ where: { id: member.id }, data: parsed.data });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "member.role_changed",
    entityType: "CompanyMember",
    entityId: member.id,
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("users:manage");
  if (error) return error;

  const member = await prisma.companyMember.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  });
  if (!member) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Não é possível remover o proprietário da empresa." }, { status: 403 });
  }

  await prisma.companyMember.update({ where: { id: member.id }, data: { status: "SUSPENDED" } });

  return NextResponse.json({ ok: true });
}
