import { dateFnsLocalizer } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const locales = { "pt-BR": ptBR };

export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0, locale: ptBR }),
  getDay,
  locales,
});

export const CALENDAR_MESSAGES = {
  today: "Hoje",
  previous: "Anterior",
  next: "Próximo",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Lista",
  date: "Data",
  time: "Horário",
  event: "Atendimento",
  noEventsInRange: "Nenhum atendimento neste período.",
  showMore: (total: number) => `+${total} mais`,
};
