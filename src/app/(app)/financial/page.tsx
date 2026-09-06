import { redirect } from "next/navigation";
import { getWorkplaceContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { FinancialView } from "./financial-view";

export default async function FinancialPage() {
  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/onboarding/company");

  if (!can(ctx, "financial:read")) {
    redirect("/dashboard");
  }

  const categories = await prisma.expenseCategory.findMany({
    where: { companyId: ctx.companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ctx.workplaceName === "Todos os locais"
            ? "Receitas, despesas e resultado consolidados de todos os locais."
            : `Receitas, despesas e resultado de ${ctx.workplaceName}.`}
        </p>
      </div>

      <FinancialView
        categories={JSON.parse(JSON.stringify(categories))}
        canWrite={can(ctx, "financial:write")}
        workplaces={ctx.workplaces}
        activeWorkplaceId={ctx.workplaceId}
      />
    </div>
  );
}
