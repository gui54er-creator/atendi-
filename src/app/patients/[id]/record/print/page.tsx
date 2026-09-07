import { notFound, redirect } from "next/navigation";
import { getWorkplaceContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calculateAge, formatDateBR } from "@/lib/utils";
import { PrintToolbar } from "./print-toolbar";
import "./print.css";

const RECORD_FIELDS: { name: string; label: string }[] = [
  { name: "mainComplaint", label: "Queixa principal" },
  { name: "reasonForVisit", label: "Motivo do atendimento" },
  { name: "history", label: "Histórico" },
  { name: "pastHistory", label: "Antecedentes" },
  { name: "medications", label: "Medicamentos em uso" },
  { name: "allergies", label: "Alergias" },
  { name: "previousTreatments", label: "Tratamentos anteriores" },
  { name: "importantNotes", label: "Observações importantes" },
  { name: "goals", label: "Objetivos do acompanhamento" },
];

export default async function RecordPrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { workplace?: string };
}) {
  const ctx = await getWorkplaceContext();
  if (!ctx) redirect("/login");
  if (!can(ctx, "clinical:read")) notFound();

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
    include: {
      workplaces: {
        include: {
          workplace: { select: { id: true, name: true } },
          record: true,
          recordTopics: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
          customFieldValues: { include: { customField: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!patient || patient.workplaces.length === 0) notFound();

  const activeLink =
    patient.workplaces.find((w) => w.workplaceId === searchParams.workplace) ??
    patient.workplaces.find((w) => w.workplaceId === ctx.workplaceId) ??
    patient.workplaces[0]!;

  const filledRecordFields = RECORD_FIELDS.map((f) => ({
    label: f.label,
    value: (activeLink.record as any)?.[f.name] as string | null | undefined,
  })).filter((f) => f.value && f.value.trim() !== "");

  const filledCustomFields = activeLink.customFieldValues.filter(
    (v) => v.value && v.value.trim() !== ""
  );

  const hasAnyContent =
    filledRecordFields.length > 0 || filledCustomFields.length > 0 || activeLink.recordTopics.length > 0;

  return (
    <div className="print-page bg-muted/40">
      <PrintToolbar patientId={patient.id} />

      <div className="print-sheet mx-auto max-w-[210mm] bg-white p-[15mm] text-neutral-900 shadow-lg print:shadow-none">
        <header className="mb-6 border-b border-neutral-300 pb-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{ctx.companyName}</p>
          <h1 className="mt-1 text-xl font-bold">Prontuário — {patient.fullName}</h1>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-600">
            <span>Local: {activeLink.workplace.name}</span>
            <span>Impresso em: {formatDateBR(new Date())}</span>
            <span>Profissional: {ctx.user.name}</span>
          </div>
        </header>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Dados do paciente
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="text-neutral-500">Nome</dt>
              <dd>{patient.fullName}</dd>
            </div>
            {patient.socialName && (
              <div>
                <dt className="text-neutral-500">Nome social</dt>
                <dd>{patient.socialName}</dd>
              </div>
            )}
            {patient.birthDate && (
              <div>
                <dt className="text-neutral-500">Nascimento</dt>
                <dd>
                  {formatDateBR(patient.birthDate)} ({calculateAge(patient.birthDate)} anos)
                </dd>
              </div>
            )}
            {patient.cpf && (
              <div>
                <dt className="text-neutral-500">CPF</dt>
                <dd>{patient.cpf}</dd>
              </div>
            )}
            {(patient.phone || patient.whatsapp) && (
              <div>
                <dt className="text-neutral-500">Telefone</dt>
                <dd>{patient.phone || patient.whatsapp}</dd>
              </div>
            )}
            {patient.email && (
              <div>
                <dt className="text-neutral-500">E-mail</dt>
                <dd>{patient.email}</dd>
              </div>
            )}
          </dl>
        </section>

        {filledRecordFields.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Prontuário
            </h2>
            <div className="space-y-3">
              {filledRecordFields.map((f) => (
                <div key={f.label} className="break-inside-avoid">
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="whitespace-pre-wrap text-sm text-neutral-700">{f.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {filledCustomFields.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Campos personalizados
            </h2>
            <div className="space-y-3">
              {filledCustomFields.map((v) => (
                <div key={v.id} className="break-inside-avoid">
                  <p className="text-sm font-semibold">{v.customField.label}</p>
                  <p className="whitespace-pre-wrap text-sm text-neutral-700">{v.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeLink.recordTopics.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Tópicos do prontuário
            </h2>
            <div className="space-y-4">
              {activeLink.recordTopics.map((topic) => (
                <div key={topic.id} className="break-inside-avoid">
                  <p className="text-sm font-semibold">{topic.title}</p>
                  <p className="whitespace-pre-wrap text-sm text-neutral-700">
                    {topic.content || "Sem conteúdo registrado."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!hasAnyContent && (
          <p className="text-sm italic text-neutral-500">Nenhum conteúdo registrado no prontuário.</p>
        )}
      </div>
    </div>
  );
}
