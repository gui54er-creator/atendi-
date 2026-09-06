import { redirect } from "next/navigation";
import { getWorkplaceContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AgendaView } from "./agenda-view";

export default async function AgendaPage() {
  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/onboarding/company");

  const [company, members] = await Promise.all([
    prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: {
        agendaStartTime: true,
        agendaEndTime: true,
        defaultDurationMinutes: true,
        workingDays: true,
        timezone: true,
      },
    }),
    prisma.companyMember.findMany({
      where: { companyId: ctx.companyId, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualize e organize os atendimentos da sua equipe.
        </p>
      </div>

      <AgendaView
        currentUserId={ctx.user.id}
        professionals={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        workplaces={ctx.workplaces}
        activeWorkplaceId={ctx.workplaceId}
        agendaSettings={{
          startTime: company?.agendaStartTime ?? "08:00",
          endTime: company?.agendaEndTime ?? "19:00",
          defaultDurationMinutes: company?.defaultDurationMinutes ?? 60,
        }}
      />
    </div>
  );
}
