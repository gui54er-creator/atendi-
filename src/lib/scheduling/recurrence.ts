import { addDays, addMonths, addWeeks, isAfter, isBefore, startOfWeek } from "date-fns";

export interface RecurrenceRule {
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";
  interval: number;
  daysOfWeek: number[];
  startTime: string; // "HH:mm"
  durationMinutes: number;
  startDate: Date;
  endDate: Date | null;
  indefinite: boolean;
}

export const RECURRENCE_ROLLING_WINDOW_MONTHS = 6;

/**
 * Materializa ocorrências reais (Appointment) a partir de uma regra de
 * recorrência. Séries "indefinidas" não geram infinitos registros — são
 * materializadas numa janela rolante de RECURRENCE_ROLLING_WINDOW_MONTHS a
 * partir da data inicial. Extensão futura: um job periódico que, ao se
 * aproximar do fim da janela materializada, gera o próximo bloco de
 * ocorrências para séries sem data-fim (ainda não implementado).
 */
export function generateOccurrences(rule: RecurrenceRule): { startsAt: Date; endsAt: Date }[] {
  const windowEnd = rule.endDate ?? addMonths(rule.startDate, RECURRENCE_ROLLING_WINDOW_MONTHS);
  const [hh, mm] = rule.startTime.split(":").map(Number);

  function withTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(hh ?? 0, mm ?? 0, 0, 0);
    return d;
  }

  const occurrences: { startsAt: Date; endsAt: Date }[] = [];

  if (rule.frequency === "MONTHLY") {
    let cursor = new Date(rule.startDate);
    let safety = 0;
    while (!isAfter(cursor, windowEnd) && safety < 60) {
      occurrences.push(makeOccurrence(withTime(cursor), rule.durationMinutes));
      cursor = addMonths(cursor, 1);
      safety++;
    }
    return occurrences;
  }

  const intervalWeeks = rule.frequency === "BIWEEKLY" ? 2 : rule.frequency === "CUSTOM" ? rule.interval : 1;
  let weekStart = startOfWeek(rule.startDate, { weekStartsOn: 0 });
  let safety = 0;

  while (!isAfter(weekStart, windowEnd) && safety < 200) {
    for (const dow of rule.daysOfWeek) {
      const day = addDays(weekStart, dow);
      const dayStart = withTime(day);
      if (isBefore(dayStart, rule.startDate)) continue;
      if (isAfter(dayStart, windowEnd)) continue;
      occurrences.push(makeOccurrence(dayStart, rule.durationMinutes));
    }
    weekStart = addWeeks(weekStart, intervalWeeks);
    safety++;
  }

  return occurrences.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function makeOccurrence(startsAt: Date, durationMinutes: number) {
  return { startsAt, endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000) };
}
