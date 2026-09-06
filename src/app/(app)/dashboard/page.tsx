import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Users, TrendingUp, Clock3, Plus, UserPlus, Receipt } from "lucide-react";
import { getWorkplaceContext } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard";
import { ensureDailyNotifications } from "@/lib/notifications";
import { can } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrencyBRL, formatTimeBR, getInitials } from "@/lib/utils";
import { DashboardChart } from "./dashboard-chart";

export default async function DashboardPage() {
  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/onboarding/company");

  const data = await getDashboardData(ctx.companyId, ctx.workplaceId);
  const canSeeFinancial = can(ctx, "financial:read");
  await ensureDailyNotifications(ctx.companyId, ctx.user.id);

  const cards = [
    { icon: CalendarClock, label: "Atendimentos hoje", value: String(data.cards.appointmentsToday) },
    { icon: Users, label: "Pacientes ativos", value: String(data.cards.activePatients) },
    ...(canSeeFinancial
      ? [
          { icon: TrendingUp, label: "Receita do mês", value: formatCurrencyBRL(data.cards.revenueThisMonth) },
          { icon: Clock3, label: "Valores pendentes", value: formatCurrencyBRL(data.cards.pendingReceivable) },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {ctx.user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ctx.workplaceName === "Todos os locais"
            ? "Visão consolidada de todos os locais."
            : `Aqui está o resumo de ${ctx.workplaceName} hoje.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Agenda de hoje</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/agenda">
                <Plus className="h-4 w-4" /> Novo
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <p className="text-sm text-muted-foreground">Nenhum atendimento hoje.</p>
              </div>
            ) : (
              data.todayAppointments.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/patients/${a.patient.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <span className="w-12 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {formatTimeBR(a.startsAt)}
                  </span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={a.patient.photoUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(a.patient.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{a.patient.fullName}</span>
                  {!ctx.workplaceId && (
                    <span
                      className="ml-auto h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: a.workplace.color }}
                      title={a.workplace.name}
                    />
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {canSeeFinancial ? (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardChart monthlySeries={data.monthlySeries} />
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center lg:col-span-3">
            <UserPlus className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Pronto para atender?</p>
              <p className="text-sm text-muted-foreground">Cadastre um paciente ou marque um atendimento.</p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/patients/new">Novo paciente</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/agenda">
                  <Receipt className="h-4 w-4" /> Abrir agenda
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
