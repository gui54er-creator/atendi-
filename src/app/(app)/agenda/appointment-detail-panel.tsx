"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, CalendarClock, ExternalLink, PlayCircle, Pencil, Clock, MapPin, Wallet } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrencyBRL, formatDateTimeBR, getInitials } from "@/lib/utils";
import { EditAppointmentDialog } from "./edit-appointment-dialog";

export function AppointmentDetailPanel({
  appointment,
  professionals,
  onClose,
  onChanged,
}: {
  appointment: any;
  professionals: { id: string; name: string }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const durationMinutes = Math.round(
    (new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()) / 60000
  );

  async function quickStatusUpdate(status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}?scope=this`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(status === "IN_PROGRESS" ? "Atendimento iniciado." : "Atendimento cancelado.");
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <EditAppointmentDialog
        appointment={appointment}
        professionals={professionals}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChanged();
        }}
      />
    );
  }

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Atendimento</SheetTitle>
          </SheetHeader>

          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={appointment.patient.photoUrl ?? undefined} />
              <AvatarFallback className="text-lg">{getInitials(appointment.patient.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{appointment.patient.fullName}</p>
              <Badge className="mt-1">{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
            <DetailRow icon={Clock} label="Horário">
              {formatDateTimeBR(appointment.startsAt)} · {durationMinutes} min
            </DetailRow>
            <DetailRow icon={MapPin} label="Local">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: appointment.workplace?.color }} />
                {appointment.workplace?.name}
              </span>
            </DetailRow>
            <DetailRow icon={CalendarClock} label="Tipo">
              {appointment.type}
            </DetailRow>
            {appointment.value && (
              <DetailRow icon={Wallet} label="Valor">
                {formatCurrencyBRL(appointment.value)}
              </DetailRow>
            )}
            {appointment.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Observação</p>
                <p className="mt-0.5">{appointment.notes}</p>
              </div>
            )}
          </div>

          <SheetFooter>
            <Button asChild variant="outline">
              <Link href={`/patients/${appointment.patient.id}`}>
                <ExternalLink className="h-4 w-4" /> Abrir paciente
              </Link>
            </Button>
            {["SCHEDULED", "CONFIRMED"].includes(appointment.status) && (
              <Button variant="outline" onClick={() => quickStatusUpdate("IN_PROGRESS")} disabled={busy}>
                <PlayCircle className="h-4 w-4" /> Iniciar atendimento
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Editar / Reagendar
            </Button>
            {appointment.status !== "CANCELED" && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelConfirm(true)}
              >
                <Ban className="h-4 w-4" /> Cancelar atendimento
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={cancelConfirm} onOpenChange={setCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              O horário ficará marcado como cancelado e liberado na agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setCancelConfirm(false);
                quickStatusUpdate("CANCELED");
              }}
            >
              Cancelar atendimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
