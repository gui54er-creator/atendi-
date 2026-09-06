import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { agendaSettingsSchema } from "@/lib/validations/settings";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request) {
  const { ctx, error } = await requireApiContext("company:manage");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = agendaSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }

  const updated = await prisma.company.update({
    where: { id: ctx.companyId },
    data: parsed.data,
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "settings.updated",
    entityType: "Company",
    entityId: updated.id,
    metadata: { section: "agenda" },
  });

  return NextResponse.json({ company: updated });
}
