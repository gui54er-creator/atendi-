import { CalendarClock, History, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeBR } from "@/lib/utils";

export function OverviewTab({
  patient,
  activeLink,
  nextAppointment,
  lastAppointment,
}: {
  patient: any;
  activeLink: any;
  nextAppointment: any;
  lastAppointment: any;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={CalendarClock} label="Próximo atendimento">
            {nextAppointment ? formatDateTimeBR(nextAppointment.startsAt) : "Nenhum agendado"}
          </InfoRow>
          <InfoRow icon={History} label="Última consulta">
            {lastAppointment ? formatDateTimeBR(lastAppointment.startsAt) : "Sem atendimentos ainda"}
          </InfoRow>
          <InfoRow icon={Users} label="Responsáveis">
            {patient.guardians?.length > 0
              ? patient.guardians.map((g: any) => g.fullName).join(", ")
              : "Não se aplica"}
          </InfoRow>
          <InfoRow icon={FileText} label="Como conheceu a empresa">
            {activeLink.howFoundUs || "Não informado"}
          </InfoRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {patient.generalNotes || "Nenhuma observação registrada."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarClock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{children}</p>
      </div>
    </div>
  );
}
