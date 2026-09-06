"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, CalendarClock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateAge, formatDateTimeBR, getInitials } from "@/lib/utils";
import { PATIENT_STATUS_BADGE, PATIENT_STATUS_LABELS } from "@/lib/constants";
import { can, type PermissionContext } from "@/lib/permissions";
import { OverviewTab } from "./tabs/overview-tab";
import { RecordTab } from "./tabs/record-tab";
import { AppointmentsTab } from "./tabs/appointments-tab";
import { FilesTab } from "./tabs/files-tab";
import { FinancialTab } from "./tabs/financial-tab";
import { PersonalDataTab } from "./tabs/personal-data-tab";
import type { CustomFieldDef } from "@/components/forms/custom-field-input";

interface PatientDetailViewProps {
  patient: any;
  activeWorkplaceId: string;
  customFields: CustomFieldDef[];
  nextAppointment: any;
  lastAppointment: any;
  permissionContext: PermissionContext;
}

export function PatientDetailView({
  patient,
  activeWorkplaceId,
  customFields,
  nextAppointment,
  lastAppointment,
  permissionContext,
}: PatientDetailViewProps) {
  const router = useRouter();
  const canSeeClinical = can(permissionContext, "clinical:read");
  const canSeeFinancial = can(permissionContext, "financial:read");

  const activeLink = patient.workplaces.find((w: any) => w.workplaceId === activeWorkplaceId) ?? patient.workplaces[0];
  const isMultiWorkplace = patient.workplaces.length > 1;

  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para pacientes
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={patient.photoUrl ?? undefined} />
            <AvatarFallback className="text-lg">{getInitials(patient.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{patient.fullName}</h1>
              <Badge variant={PATIENT_STATUS_BADGE[activeLink.status]}>
                {PATIENT_STATUS_LABELS[activeLink.status]}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {patient.birthDate && <span>{calculateAge(patient.birthDate)} anos</span>}
              {(patient.phone || patient.whatsapp) && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {patient.phone || patient.whatsapp}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {patient.email}
                </span>
              )}
            </div>

            {isMultiWorkplace && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Atendido em:</span>
                <Select
                  value={activeLink.workplaceId}
                  onValueChange={(v) => router.push(`/patients/${patient.id}?workplace=${v}`)}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-muted/60 px-2 text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {patient.workplaces.map((w: any) => (
                      <SelectItem key={w.workplaceId} value={w.workplaceId}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: w.workplace.color }}
                          />
                          {w.workplace.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-2 text-sm">
          <CalendarClock className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Próximo atendimento</p>
            <p className="font-medium">
              {nextAppointment ? formatDateTimeBR(nextAppointment.startsAt) : "Nenhum agendado"}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          {canSeeClinical && <TabsTrigger value="record">Prontuário</TabsTrigger>}
          <TabsTrigger value="appointments">Atendimentos</TabsTrigger>
          <TabsTrigger value="files">Fotos e arquivos</TabsTrigger>
          {canSeeFinancial && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
          <TabsTrigger value="personal">Dados pessoais</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            patient={patient}
            activeLink={activeLink}
            nextAppointment={nextAppointment}
            lastAppointment={lastAppointment}
          />
        </TabsContent>

        {canSeeClinical && (
          <TabsContent value="record">
            <RecordTab patientId={patient.id} activeLink={activeLink} customFields={customFields} />
          </TabsContent>
        )}

        <TabsContent value="appointments">
          <AppointmentsTab patientId={patient.id} workplaceId={activeLink.workplaceId} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab patientId={patient.id} workplaceId={activeLink.workplaceId} />
        </TabsContent>

        {canSeeFinancial && (
          <TabsContent value="financial">
            <FinancialTab patientId={patient.id} workplaceId={activeLink.workplaceId} />
          </TabsContent>
        )}

        <TabsContent value="personal">
          <PersonalDataTab patient={patient} activeLink={activeLink} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
