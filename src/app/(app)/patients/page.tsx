import { redirect } from "next/navigation";
import { getWorkplaceContext } from "@/lib/auth/session";
import { PatientsListClient } from "./patients-list-client";

export default async function PatientsPage() {
  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/onboarding/company");

  return <PatientsListClient workplaces={ctx.workplaces} activeWorkplaceId={ctx.workplaceId} />;
}
