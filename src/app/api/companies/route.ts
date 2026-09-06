import { NextResponse } from "next/server";
import { getSessionUser, ACTIVE_COMPANY_COOKIE } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { companySchema } from "@/lib/validations/company";
import { logAudit } from "@/lib/audit";

const DEFAULT_EXPENSE_CATEGORIES = [
  "Aluguel",
  "Energia",
  "Internet",
  "Funcionários",
  "Equipamentos",
  "Materiais",
  "Marketing",
  "Impostos",
  "Outros",
];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({
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

    await tx.companyMember.create({
      data: { userId: user.id, companyId: created.id, role: "OWNER", status: "ACTIVE" },
    });

    // Toda empresa nasce com um local de trabalho padrão — pacientes, agenda
    // e financeiro sempre pertencem a algum local (ver PatientWorkplace).
    await tx.workplace.create({
      data: {
        companyId: created.id,
        name: data.tradeName || data.name,
        color: "#6366F1",
        isDefault: true,
        cep: data.cep || null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        phone: data.phone || null,
      },
    });

    await tx.expenseCategory.createMany({
      data: [
        { companyId: created.id, name: "Consulta", type: "INCOME", isDefault: true },
        ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          companyId: created.id,
          name,
          type: "EXPENSE" as const,
          isDefault: true,
        })),
      ],
    });

    return created;
  });

  await logAudit({
    companyId: company.id,
    userId: user.id,
    action: "company.created",
    entityType: "Company",
    entityId: company.id,
  });

  const res = NextResponse.json({ company }, { status: 201 });
  res.cookies.set(ACTIVE_COMPANY_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
