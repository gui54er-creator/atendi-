import "server-only";
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";

/**
 * Dashboard simplificado: responde só a "o que tenho hoje / quanto estou
 * recebendo / existe algo pendente". Tudo é filtrado pelo Local de Trabalho
 * ativo (workplaceId null = "Todos os locais", consolidado).
 */
export async function getDashboardData(companyId: string, workplaceId: string | null) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const workplaceFilter = workplaceId ? { workplaceId } : {};
  const patientWorkplaceFilter = workplaceId
    ? { workplaces: { some: { workplaceId, status: "ACTIVE" as const } } }
    : { workplaces: { some: { status: "ACTIVE" as const } } };

  const [appointmentsToday, activePatients, incomeThisMonth, expenseThisMonth, pendingIncome, todayAppointments] =
    await Promise.all([
      prisma.appointment.count({
        where: {
          companyId,
          deletedAt: null,
          startsAt: { gte: todayStart, lte: todayEnd },
          status: { not: "CANCELED" },
          ...workplaceFilter,
        },
      }),
      prisma.patient.count({ where: { companyId, deletedAt: null, ...patientWorkplaceFilter } }),
      prisma.transaction.aggregate({
        where: {
          companyId,
          deletedAt: null,
          type: "INCOME",
          status: "PAID",
          date: { gte: monthStart, lte: monthEnd },
          ...workplaceFilter,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          companyId,
          deletedAt: null,
          type: "EXPENSE",
          status: { not: "CANCELED" },
          date: { gte: monthStart, lte: monthEnd },
          ...workplaceFilter,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { companyId, deletedAt: null, type: "INCOME", status: "PENDING", ...workplaceFilter },
        _sum: { amount: true },
      }),
      prisma.appointment.findMany({
        where: {
          companyId,
          deletedAt: null,
          startsAt: { gte: todayStart, lte: todayEnd },
          status: { notIn: ["CANCELED"] },
          ...workplaceFilter,
        },
        include: {
          patient: { select: { id: true, fullName: true, photoUrl: true } },
          workplace: { select: { id: true, name: true, color: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
    ]);

  const income = Number(incomeThisMonth._sum.amount ?? 0);
  const expense = Number(expenseThisMonth._sum.amount ?? 0);

  // Série dos últimos 6 meses — um único gráfico financeiro (receita/despesas/lucro).
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }), start: startOfMonth(d), end: endOfMonth(d) });
  }

  const monthlySeries = await Promise.all(
    months.map(async (m) => {
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            companyId,
            deletedAt: null,
            type: "INCOME",
            status: "PAID",
            date: { gte: m.start, lte: m.end },
            ...workplaceFilter,
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            companyId,
            deletedAt: null,
            type: "EXPENSE",
            status: { not: "CANCELED" },
            date: { gte: m.start, lte: m.end },
            ...workplaceFilter,
          },
          _sum: { amount: true },
        }),
      ]);
      const incomeVal = Number(inc._sum.amount ?? 0);
      const expenseVal = Number(exp._sum.amount ?? 0);
      return { month: m.label, receita: incomeVal, despesas: expenseVal, lucro: incomeVal - expenseVal };
    })
  );

  return {
    cards: {
      appointmentsToday,
      activePatients,
      revenueThisMonth: income,
      pendingReceivable: Number(pendingIncome._sum.amount ?? 0),
    },
    monthlySeries,
    todayAppointments: JSON.parse(JSON.stringify(todayAppointments)),
  };
}
