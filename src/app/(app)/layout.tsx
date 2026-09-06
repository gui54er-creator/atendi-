import { redirect } from "next/navigation";
import { getWorkplaceContext, getSessionUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/onboarding/company");

  const [company, dbUser] = await Promise.all([
    prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true, logoUrl: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } }),
  ]);

  return (
    <AppShell
      companyName={company?.name ?? ctx.companyName}
      companyLogoUrl={company?.logoUrl}
      userName={ctx.user.name}
      userEmail={ctx.user.email}
      userAvatarUrl={dbUser?.avatarUrl}
      role={ctx.role}
      permissionContext={{ role: ctx.role, receptionistFinancialAccess: ctx.receptionistFinancialAccess }}
      workplaces={ctx.workplaces}
      activeWorkplaceId={ctx.workplaceId}
      activeWorkplaceName={ctx.workplaceName}
      activeWorkplaceColor={ctx.workplaceColor}
      canManageWorkplaces={can(ctx, "company:manage")}
    >
      {children}
    </AppShell>
  );
}
