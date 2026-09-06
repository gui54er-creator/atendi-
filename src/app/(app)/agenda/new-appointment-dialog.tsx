"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APPOINTMENT_TYPE_OPTIONS, WEEKDAY_LABELS_FULL } from "@/lib/constants";
import { getInitials } from "@/lib/utils";

interface Workplace {
  id: string;
  name: string;
  color: string;
}

interface Props {
  slot: { start: Date; end: Date };
  professionals: { id: string; name: string }[];
  workplaces: Workplace[];
  defaultWorkplaceId: string;
  defaultProfessionalId: string;
  defaultDurationMinutes: number;
  onClose: () => void;
  onCreated: () => void;
}

// Não repetir / semanal / quinzenal / mensal inferem o dia da semana a
// partir do horário clicado — o usuário só vê o seletor de dias quando
// escolhe "Personalizado". É a simplificação pedida: "não quero que o
// usuário precise configurar regras complexas para uma recorrência simples".
const SIMPLE_FREQUENCIES = [
  { value: "NONE", label: "Não repetir" },
  { value: "WEEKLY", label: "Toda semana" },
  { value: "BIWEEKLY", label: "A cada 2 semanas" },
  { value: "MONTHLY", label: "Todo mês" },
  { value: "CUSTOM", label: "Personalizado" },
];

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}
function toTimeInputValue(d: Date) {
  return d.toTimeString().slice(0, 5);
}

export function NewAppointmentDialog({
  slot,
  professionals,
  workplaces,
  defaultWorkplaceId,
  defaultProfessionalId,
  defaultDurationMinutes,
  onClose,
  onCreated,
}: Props) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; fullName: string; photoUrl: string | null }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; fullName: string; photoUrl: string | null } | null>(
    null
  );
  const [workplaceId, setWorkplaceId] = useState(defaultWorkplaceId || workplaces[0]?.id || "");
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId);
  const [date, setDate] = useState(toDateInputValue(slot.start));
  const [time, setTime] = useState(toTimeInputValue(slot.start));
  const [duration, setDuration] = useState(String(defaultDurationMinutes));
  const [type, setType] = useState(APPOINTMENT_TYPE_OPTIONS[0]!);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [frequency, setFrequency] = useState("NONE");
  const [interval, setInterval] = useState("1");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([slot.start.getDay()]);
  const [endDate, setEndDate] = useState("");
  const [indefinite, setIndefinite] = useState(true);
  const [moreOptions, setMoreOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{ count: number; payload: any } | null>(null);

  useEffect(() => {
    if (patientQuery.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ q: patientQuery, pageSize: "6" });
      if (workplaceId) params.set("workplaceId", workplaceId);
      const res = await fetch(`/api/patients?${params.toString()}`);
      const data = await res.json();
      setPatientResults(data.items ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery, workplaceId]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  const recurrencePreview = useMemo(() => {
    if (frequency === "NONE" || frequency === "CUSTOM") return null;
    const dow = WEEKDAY_LABELS_FULL[slot.start.getDay()];
    const suffix =
      frequency === "WEEKLY" ? `toda ${dow}` : frequency === "BIWEEKLY" ? `${dow} sim, ${dow} não` : `todo dia ${slot.start.getDate()}`;
    return `Repete ${suffix} às ${time}, indefinidamente.`;
  }, [frequency, time, slot.start]);

  function buildPayload(overrideConflict = false) {
    const startsAt = new Date(`${date}T${time}:00`);
    const effectiveDaysOfWeek =
      frequency === "CUSTOM" ? daysOfWeek : frequency === "MONTHLY" ? [startsAt.getDay()] : [startsAt.getDay()];
    return {
      patientId: selectedPatient!.id,
      workplaceId,
      professionalId,
      startsAt: startsAt.toISOString(),
      durationMinutes: Number(duration),
      type,
      value: value ? Number(value) : null,
      notes: notes || undefined,
      overrideConflict,
      recurrence:
        frequency === "NONE"
          ? null
          : {
              frequency,
              interval: frequency === "CUSTOM" ? Number(interval) : frequency === "BIWEEKLY" ? 2 : 1,
              daysOfWeek: effectiveDaysOfWeek.length > 0 ? effectiveDaysOfWeek : [startsAt.getDay()],
              endDate: frequency === "CUSTOM" && !indefinite ? endDate || null : null,
              indefinite: frequency === "CUSTOM" ? indefinite : true,
            },
    };
  }

  async function submit(overrideConflict = false) {
    if (!selectedPatient) {
      toast.error("Selecione um paciente.");
      return;
    }
    if (!workplaceId) {
      toast.error("Selecione um local.");
      return;
    }
    setLoading(true);
    try {
      const payload = buildPayload(overrideConflict);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 409) {
        const count = data.conflicts?.length ?? 1;
        setConflictInfo({ count, payload });
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Erro ao criar agendamento.");

      toast.success(
        data.created ? `${data.created} atendimento(s) agendado(s).` : "Atendimento agendado com sucesso."
      );
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo atendimento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedPatient ? (
              <div className="relative">
                <Label>Paciente</Label>
                <div className="relative mt-1.5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Pesquisar paciente..."
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                {patientResults.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientResults([]);
                        }}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={p.photoUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">{getInitials(p.fullName)}</AvatarFallback>
                        </Avatar>
                        {p.fullName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-border p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedPatient.photoUrl ?? undefined} />
                    <AvatarFallback>{getInitials(selectedPatient.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{selectedPatient.fullName}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Duração</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 50, 60, 90, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} minutos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local</Label>
                <Select value={workplaceId} onValueChange={setWorkplaceId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workplaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
                          {w.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="150,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Repetir</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIMPLE_FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {recurrencePreview && <p className="mt-1.5 text-xs text-muted-foreground">{recurrencePreview}</p>}

              {frequency === "CUSTOM" && (
                <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Dias da semana</Label>
                    <div className="mt-1.5 flex gap-1">
                      {WEEKDAY_LABELS_FULL.map((label, i) => (
                        <button
                          type="button"
                          key={label}
                          onClick={() => toggleDay(i)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                            daysOfWeek.includes(i)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {label[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Repetir a cada N semanas</Label>
                    <Input
                      type="number"
                      min={1}
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                      className="mt-1.5 w-24"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={indefinite} onCheckedChange={(v) => setIndefinite(!!v)} />
                    <Label className="font-normal">Repetir indefinidamente</Label>
                  </div>
                  {!indefinite && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Data final</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMoreOptions((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOptions ? "rotate-180" : ""}`} />
              Mais opções
            </button>

            {moreOptions && (
              <div className="space-y-4 rounded-lg border border-border p-3">
                {professionals.length > 1 && (
                  <div>
                    <Label>Profissional</Label>
                    <Select value={professionalId} onValueChange={setProfessionalId}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Tipo de atendimento</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1.5" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => submit(false)} disabled={loading || !selectedPatient}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Agendar atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!conflictInfo} onOpenChange={(open) => !open && setConflictInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conflito de horário</AlertDialogTitle>
            <AlertDialogDescription>
              {conflictInfo?.count === 1
                ? "Já existe um atendimento neste horário para este profissional."
                : `${conflictInfo?.count} data(s) da recorrência têm conflito com atendimentos já existentes. As demais datas serão criadas normalmente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConflictInfo(null);
                submit(true);
              }}
            >
              Agendar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
