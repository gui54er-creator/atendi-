"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Views, type View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import {
  addMonths,
  addWeeks,
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./agenda.css";
import { localizer, CALENDAR_MESSAGES } from "@/lib/scheduling/calendar-localizer";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { AppointmentDetailPanel } from "./appointment-detail-panel";

const DnDCalendar = withDragAndDrop(Calendar);

interface Professional {
  id: string;
  name: string;
}

interface AppointmentEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: any;
}

function getRange(date: Date, view: View) {
  if (view === Views.MONTH) return { start: startOfMonth(date), end: endOfMonth(date) };
  if (view === Views.DAY) return { start: startOfDay(date), end: endOfDay(date) };
  return { start: startOfWeek(date, { weekStartsOn: 0 }), end: endOfWeek(date, { weekStartsOn: 0 }) };
}

interface WorkplaceOption {
  id: string;
  name: string;
  color: string;
}

export function AgendaView({
  currentUserId,
  professionals,
  workplaces,
  activeWorkplaceId,
  agendaSettings,
}: {
  currentUserId: string;
  professionals: Professional[];
  workplaces: WorkplaceOption[];
  activeWorkplaceId: string | null;
  agendaSettings: { startTime: string; endTime: string; defaultDurationMinutes: number };
}) {
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [newSlot, setNewSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  // A visão semanal (7 colunas) fica ilegível em telas pequenas — no celular
  // a agenda abre direto no dia, como apps de calendário nativos fazem.
  useEffect(() => {
    if (window.innerWidth < 640) setView(Views.DAY);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { start, end } = getRange(date, view);
    const res = await fetch(`/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}`);
    const data = await res.json();
    setEvents(
      (data.appointments ?? []).map((a: any) => ({
        id: a.id,
        title: `${a.patient.fullName} — ${a.type}`,
        start: new Date(a.startsAt),
        end: new Date(a.endsAt),
        resource: a,
      }))
    );
    setLoading(false);
  }, [date, view]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleEvents = useMemo(
    () =>
      professionalFilter === "all"
        ? events
        : events.filter((e) => e.resource.professional.id === professionalFilter),
    [events, professionalFilter]
  );

  function goToday() {
    setDate(new Date());
  }
  function goPrev() {
    setDate((d) => (view === Views.MONTH ? subMonths(d, 1) : view === Views.DAY ? subDays(d, 1) : subWeeks(d, 1)));
  }
  function goNext() {
    setDate((d) => (view === Views.MONTH ? addMonths(d, 1) : view === Views.DAY ? addDays(d, 1) : addWeeks(d, 1)));
  }

  const rangeLabel = useMemo(() => {
    if (view === Views.MONTH) return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    if (view === Views.DAY) return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const { start, end } = getRange(date, view);
    return `${format(start, "dd MMM", { locale: ptBR })} – ${format(end, "dd MMM yyyy", { locale: ptBR })}`;
  }, [date, view]);

  async function handleEventDrop({ event, start, end }: any) {
    const previous = events;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, start, end } : e)));
    const res = await fetch(`/api/appointments/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setEvents(previous);
      toast.error(data.error ?? "Não foi possível mover o atendimento.");
    } else {
      toast.success("Atendimento reagendado.");
    }
  }

  async function handleEventResize({ event, start, end }: any) {
    const previous = events;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, start, end } : e)));
    const res = await fetch(`/api/appointments/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: start.toISOString(), endsAt: end.toISOString() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setEvents(previous);
      toast.error(data.error ?? "Não foi possível alterar a duração.");
    }
  }

  const [minTime, maxTime] = useMemo(() => {
    const [sh, sm] = agendaSettings.startTime.split(":");
    const [eh, em] = agendaSettings.endTime.split(":");
    const min = new Date();
    min.setHours(Number(sh ?? 8), Number(sm ?? 0), 0, 0);
    const max = new Date();
    max.setHours(Number(eh ?? 19), Number(em ?? 0), 0, 0);
    return [min, max];
  }, [agendaSettings]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-1 text-sm font-medium capitalize">{rangeLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {professionals.length > 1 && (
            <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos profissionais</SelectItem>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex rounded-lg border border-border p-0.5">
            {[
              { view: Views.DAY, label: "Dia" },
              { view: Views.WEEK, label: "Semana" },
              { view: Views.MONTH, label: "Mês" },
            ].map((v) => (
              <button
                key={v.view}
                onClick={() => setView(v.view)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v.view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => {
              const start = new Date();
              start.setMinutes(0, 0, 0);
              const end = new Date(start.getTime() + agendaSettings.defaultDurationMinutes * 60_000);
              setNewSlot({ start, end });
            }}
          >
            <Plus className="h-4 w-4" /> Novo agendamento
          </Button>
        </div>
      </div>

      <div className="atendi-calendar" style={{ height: 700 }}>
        <DnDCalendar
          localizer={localizer}
          culture="pt-BR"
          messages={CALENDAR_MESSAGES}
          events={visibleEvents}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          views={[Views.DAY, Views.WEEK, Views.MONTH]}
          toolbar={false}
          min={minTime}
          max={maxTime}
          step={30}
          timeslots={2}
          selectable
          resizable
          popup
          onSelectSlot={(slot) => setNewSlot({ start: slot.start, end: slot.end })}
          onSelectEvent={(event: any) => setEditing(event.resource)}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          components={{
            event: ({ event }: any) => (
              <div>
                <p className="truncate text-[11px] font-semibold leading-tight">
                  {new Date(event.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="truncate text-xs leading-tight">{event.resource.patient.fullName}</p>
                {!activeWorkplaceId && (
                  <p className="truncate text-[10px] leading-tight opacity-70">{event.resource.workplace.name}</p>
                )}
              </div>
            ),
          }}
          eventPropGetter={(event: any) => {
            const colors = APPOINTMENT_STATUS_COLORS[event.resource.status] ?? APPOINTMENT_STATUS_COLORS.SCHEDULED!;
            return {
              style: {
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text,
                ...(!activeWorkplaceId
                  ? { borderLeftWidth: 3, borderLeftColor: event.resource.workplace.color }
                  : {}),
              },
            };
          }}
        />
      </div>

      {newSlot && (
        <NewAppointmentDialog
          slot={newSlot}
          professionals={professionals}
          workplaces={workplaces}
          defaultWorkplaceId={activeWorkplaceId ?? workplaces[0]?.id ?? ""}
          defaultProfessionalId={currentUserId}
          defaultDurationMinutes={agendaSettings.defaultDurationMinutes}
          onClose={() => setNewSlot(null)}
          onCreated={() => {
            setNewSlot(null);
            load();
          }}
        />
      )}

      {editing && (
        <AppointmentDetailPanel
          appointment={editing}
          professionals={professionals}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
