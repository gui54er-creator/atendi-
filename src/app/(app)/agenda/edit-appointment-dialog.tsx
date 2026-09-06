"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_OPTIONS } from "@/lib/constants";

type Scope = "this" | "following" | "all";

export function EditAppointmentDialog({
  appointment,
  professionals,
  onClose,
  onSaved,
}: {
  appointment: any;
  professionals: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(appointment.type);
  const [value, setValue] = useState(appointment.value ?? "");
  const [status, setStatus] = useState(appointment.status);
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [date, setDate] = useState(new Date(appointment.startsAt).toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date(appointment.startsAt).toTimeString().slice(0, 5));
  const [duration, setDuration] = useState(
    String(Math.round((new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60000))
  );
  const [loading, setLoading] = useState(false);
  const [scopeDialog, setScopeDialog] = useState<"save" | "delete" | null>(null);

  const isSeries = !!appointment.seriesId;

  async function persist(scope: Scope) {
    setLoading(true);
    try {
      const startsAt = new Date(`${date}T${time}:00`);
      const endsAt = new Date(startsAt.getTime() + Number(duration) * 60_000);
      const res = await fetch(`/api/appointments/${appointment.id}?scope=${scope}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          value: value ? Number(value) : null,
          status,
          notes,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar.");
      toast.success("Atendimento atualizado.");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(scope: Scope) {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}?scope=${scope}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao excluir.");
      toast.success("Atendimento excluído.");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveClick() {
    if (isSeries) setScopeDialog("save");
    else persist("this");
  }

  function handleDeleteClick() {
    if (isSeries) setScopeDialog("delete");
    else remove("this");
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar atendimento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Link
              href={`/patients/${appointment.patient.id}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {appointment.patient.fullName} <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 50, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
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
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPOINTMENT_STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Input
              type="number"
              step="0.01"
              placeholder="Valor (R$)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />

            <Textarea placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <DialogFooter className="justify-between sm:justify-between">
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <Button onClick={handleSaveClick} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!scopeDialog} onOpenChange={(open) => !open && setScopeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este atendimento faz parte de uma série recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              {scopeDialog === "delete" ? "Como deseja excluir?" : "Como deseja aplicar as alterações?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const action = scopeDialog === "delete" ? remove : persist;
                setScopeDialog(null);
                action("this");
              }}
            >
              Somente este atendimento
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const action = scopeDialog === "delete" ? remove : persist;
                setScopeDialog(null);
                action("following");
              }}
            >
              Este e os próximos
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const action = scopeDialog === "delete" ? remove : persist;
                setScopeDialog(null);
                action("all");
              }}
            >
              Toda a série
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
