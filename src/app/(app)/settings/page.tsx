import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const ctx = await getCompanyContext();
  if (!ctx) redirect("/onboarding/company");

  const [user, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { name: true, email: true, phone: true, avatarUrl: true },
    }),
    prisma.company.findUnique({ where: { id: ctx.companyId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil, empresa, agenda, financeiro e equipe.
        </p>
      </div>

      <SettingsView
        user={JSON.parse(JSON.stringify(user))}
        company={JSON.parse(JSON.stringify(company))}
        permissionContext={{ role: ctx.role, receptionistFinancialAccess: ctx.receptionistFinancialAccess }}
        canManageCompany={can(ctx, "company:manage")}
        canManageUsers={can(ctx, "users:manage")}
        canReadAudit={can(ctx, "audit:read")}
      />
    </div>
  );
}
