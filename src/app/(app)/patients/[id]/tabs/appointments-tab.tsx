"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Clock, Loader2, MessageSquarePlus, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrencyBRL, formatDateTimeBR } from "@/lib/utils";
import {
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUS_LABELS,
} from "@/lib/constants";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  type: string;
  status: string;
  value: string | null;
  notes: string | null;
  professional: { name: string };
  appointmentNotes: { id: string; content: string; createdAt: string; author: { name: string } }[];
  transactions?: { id: string; amount: string; status: string; paymentMethod: string | null }[];
  _count: { files: number };
}

export function AppointmentsTab({ patientId, workplaceId }: { patientId: string; workplaceId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/appointments?workplaceId=${workplaceId}`);
    const data = await res.json();
    setAppointments(data.appointments ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, workplaceId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando atendimentos...</p>;
  }

  if (appointments.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarClock className="h-6 w-6" />
        </span>
        <p className="font-medium">Nenhum atendimento registrado ainda</p>
        <p className="text-sm text-muted-foreground">
          Agende um atendimento na Agenda para começar o histórico deste paciente.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => (
        <button key={appt.id} className="block w-full text-left" onClick={() => setSelected(appt)}>
          <Card className="flex items-center gap-4 p-4 transition-colors hover:border-primary/40">
            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{formatDateTimeBR(appt.startsAt)}</p>
              <p className="truncate text-sm text-muted-foreground">
                {appt.type} · {appt.professional.name}
                {appt.appointmentNotes.length > 0 && ` · ${appt.appointmentNotes.length} anotação(ões)`}
              </p>
            </div>
            {appt.value && <span className="text-sm font-medium">{formatCurrencyBRL(appt.value)}</span>}
            <Badge>{APPOINTMENT_STATUS_LABELS[appt.status]}</Badge>
          </Card>
        </button>
      ))}

      {selected && (
        <AppointmentDetailDialog
          appointment={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function AppointmentDetailDialog({
  appointment,
  onClose,
  onUpdated,
}: {
  appointment: Appointment;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [noteContent, setNoteContent] = useState("");
  const [notes, setNotes] = useState(appointment.appointmentNotes);
  const [savingNote, setSavingNote] = useState(false);
  const [status, setStatus] = useState(appointment.status);
  const [savingStatus, setSavingStatus] = useState(false);

  const existingTransaction = appointment.transactions?.[0];
  const [amount, setAmount] = useState(existingTransaction?.amount ?? appointment.value ?? "");
  const [paymentStatus, setPaymentStatus] = useState(existingTransaction?.status ?? "PENDING");
  const [paymentMethod, setPaymentMethod] = useState(existingTransaction?.paymentMethod ?? "PIX");
  const [savingPayment, setSavingPayment] = useState(false);

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes((prev) => [data.note, ...prev]);
      setNoteContent("");
      toast.success("Anotação adicionada.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleStatusChange(value: string) {
    setStatus(value);
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Status atualizado.");
      onUpdated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSavePayment() {
    setSavingPayment(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount) || 0,
          status: paymentStatus,
          paymentMethod,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Pagamento registrado.");
      onUpdated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPayment(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{formatDateTimeBR(appointment.startsAt)}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {appointment.type} · {appointment.professional.name}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="h-4 w-4" /> Pagamento
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Valor"
              />
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSavePayment} disabled={savingPayment} className="w-full">
              {savingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar pagamento
            </Button>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <MessageSquarePlus className="h-4 w-4" /> Anotações da evolução
            </p>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Registrar evolução, observações da sessão..."
              rows={3}
            />
            <Button size="sm" onClick={handleAddNote} disabled={savingNote}>
              {savingNote && <Loader2 className="h-4 w-4 animate-spin" />}
              Adicionar anotação
            </Button>

            <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin">
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p>{n.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.author.name} · {formatDateTimeBR(n.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
