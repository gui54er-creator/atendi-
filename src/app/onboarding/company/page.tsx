import { redirect } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { getCompanyContext, getSessionUser } from "@/lib/auth/session";
import { CompanyOnboardingForm } from "./company-form";

export default async function OnboardingCompanyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const ctx = await getCompanyContext();
  if (ctx) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Cadastre sua empresa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Antes de começar, conte um pouco sobre a empresa, clínica ou consultório onde você
            atende. Você poderá editar essas informações depois.
          </p>
        </div>

        <CompanyOnboardingForm />
      </div>
    </div>
  );
}
