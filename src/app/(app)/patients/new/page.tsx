import { redirect } from "next/navigation";
import { getWorkplaceContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PatientWizard } from "./patient-wizard";

export default async function NewPatientPage() {
  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/onboarding/company");

  const customFields = await prisma.customField.findMany({
    where: { companyId: ctx.companyId, deletedAt: null },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Novo paciente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha as informações abaixo. Você pode completar a ficha completa depois.
      </p>

      <div className="mt-6">
        <PatientWizard
          customFields={customFields.map((f) => ({
            id: f.id,
            label: f.label,
            type: f.type,
            options: (f.options as string[] | null) ?? [],
            required: f.required,
          }))}
          workplaces={ctx.workplaces}
          defaultWorkplaceId={ctx.workplaceId ?? ctx.workplaces[0]?.id ?? ""}
        />
      </div>
    </div>
  );
}
