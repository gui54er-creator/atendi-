import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { companySchema } from "@/lib/validations/company";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const { ctx, error } = await requireApiContext();
  if (error) return error;

  const company = await prisma.company.findUnique({ where: { id: ctx.companyId } });
  return NextResponse.json({ company });
}

export async function PATCH(req: Request) {
  const { ctx, error } = await requireApiContext("company:manage");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const updated = await prisma.company.update({
    where: { id: ctx.companyId },
    data: {
      name: data.name,
      tradeName: data.tradeName || null,
      taxId: data.taxId || null,
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
      logoUrl: data.logoUrl || null,
    },
  });

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "settings.updated",
    entityType: "Company",
    entityId: updated.id,
  });

  return NextResponse.json({ company: updated });
}
