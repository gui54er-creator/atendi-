import { notFound, redirect } from "next/navigation";
import { getWorkplaceContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PatientDetailView } from "./patient-detail-view";

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { workplace?: string };
}) {
  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/onboarding/company");

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
    include: {
      guardians: true,
      workplaces: {
        include: {
          workplace: { select: { id: true, name: true, color: true } },
          record: true,
          customFieldValues: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!patient || patient.workplaces.length === 0) notFound();

  const activeLink =
    patient.workplaces.find((w) => w.workplaceId === searchParams.workplace) ??
    patient.workplaces.find((w) => w.workplaceId === ctx.workplaceId) ??
    patient.workplaces[0]!;

  const [customFields, nextAppointment, lastAppointment] = await Promise.all([
    prisma.customField.findMany({
      where: { companyId: ctx.companyId, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        workplaceId: activeLink.workplaceId,
        deletedAt: null,
        startsAt: { gt: new Date() },
        status: { notIn: ["CANCELED"] },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        workplaceId: activeLink.workplaceId,
        deletedAt: null,
        startsAt: { lte: new Date() },
      },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  return (
    <PatientDetailView
      patient={JSON.parse(JSON.stringify(patient))}
      activeWorkplaceId={activeLink.workplaceId}
      customFields={JSON.parse(JSON.stringify(customFields))}
      nextAppointment={JSON.parse(JSON.stringify(nextAppointment))}
      lastAppointment={JSON.parse(JSON.stringify(lastAppointment))}
      permissionContext={{ role: ctx.role, receptionistFinancialAccess: ctx.receptionistFinancialAccess }}
    />
  );
}
