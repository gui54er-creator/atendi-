"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, User, AlertTriangle } from "lucide-react";
import { patientSchema, type PatientInput } from "@/lib/validations/patient";
import { calculateAge, formatCPFOrCNPJ, formatPhone, isMinor } from "@/lib/utils";
import {
  EDUCATION_OPTIONS,
  GUARDIAN_RELATIONSHIP_OPTIONS,
  HOW_FOUND_US_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PATIENT_STATUS_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Stepper } from "@/components/forms/stepper";
import { AddressFields } from "@/components/forms/address-fields";
import { ImageUpload } from "@/components/forms/image-upload";
import { CustomFieldInput, type CustomFieldDef } from "@/components/forms/custom-field-input";

const STEPS = ["Dados pessoais", "Contato", "Endereço", "Responsável", "Ficha inicial", "Revisão"];
const DRAFT_KEY = "atendi:patient-draft";

const emptyGuardian = {
  fullName: "",
  relationship: "",
  cpf: "",
  phone: "",
  whatsapp: "",
  email: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

const defaultValues: PatientInput = {
  photoUrl: "",
  fullName: "",
  socialName: "",
  cpf: "",
  rg: "",
  birthDate: "",
  sex: "NOT_INFORMED",
  gender: "",
  maritalStatus: "",
  profession: "",
  education: "",
  nationality: "Brasileira",
  phone: "",
  whatsapp: "",
  email: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  howFoundUs: "",
  generalNotes: "",
  firstVisitDate: "",
  status: "ACTIVE",
  guardians: [],
  record: {
    mainComplaint: "",
    reasonForVisit: "",
    history: "",
    pastHistory: "",
    medications: "",
    allergies: "",
    previousTreatments: "",
    importantNotes: "",
    goals: "",
  },
  customFieldValues: {},
};

const STEP_FIELDS: (keyof PatientInput)[][] = [
  ["fullName", "birthDate", "sex"],
  ["phone", "email"],
  ["cep", "city", "state"],
  ["guardians"],
  [],
  [],
];

interface WorkplaceOption {
  id: string;
  name: string;
  color: string;
}

export function PatientWizard({
  customFields,
  workplaces,
  defaultWorkplaceId,
}: {
  customFields: CustomFieldDef[];
  workplaces: WorkplaceOption[];
  defaultWorkplaceId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [workplaceId, setWorkplaceId] = useState(defaultWorkplaceId || workplaces[0]?.id || "");

  const form = useForm<PatientInput>({
    resolver: zodResolver(patientSchema),
    defaultValues,
    mode: "onChange",
  });

  const guardianArray = useFieldArray({ control: form.control, name: "guardians" });

  const birthDate = form.watch("birthDate");
  const minor = birthDate ? isMinor(birthDate) : false;
  const effectiveSteps = minor ? STEPS : STEPS.filter((s) => s !== "Responsável");

  // Rascunho local: evita perda de dados se a aba fechar sem enviar.
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw && !draftRestored) {
      try {
        const parsed = JSON.parse(raw);
        form.reset(parsed);
        setDraftRestored(true);
        toast.info("Continuando um rascunho salvo anteriormente.", {
          action: {
            label: "Descartar",
            onClick: () => {
              localStorage.removeItem(DRAFT_KEY);
              form.reset(defaultValues);
            },
          },
        });
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const subscription = form.watch((values) => {
      const t = setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(values)), 500);
      return () => clearTimeout(t);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const currentStepKey = effectiveSteps[step];
  const stepIndexInFull = STEPS.indexOf(currentStepKey!);

  async function handleNext() {
    const fields = STEP_FIELDS[stepIndexInFull] ?? [];
    if (fields.length > 0) {
      const valid = await form.trigger(fields as (keyof PatientInput)[]);
      if (!valid) return;
    }
    const nextStepKey = effectiveSteps[step + 1];
    if (nextStepKey === "Responsável" && guardianArray.fields.length === 0) {
      guardianArray.append(emptyGuardian);
    }
    setStep((s) => Math.min(s + 1, effectiveSteps.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(values: PatientInput) {
    if (!workplaceId) {
      toast.error("Selecione o local de trabalho deste paciente.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, workplaceId }),
      });
      const data = await res.json();

      if (res.status === 409 && data.suggestImport) {
        toast.error(data.error, {
          duration: 10000,
          action: {
            label: "Importar paciente existente",
            onClick: async () => {
              const importRes = await fetch(`/api/workplaces/${workplaceId}/import-patients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sourceWorkplaceId: data.suggestImport.sourceWorkplaceId,
                  patientIds: [data.suggestImport.patientId],
                }),
              });
              if (importRes.ok) toast.success(`${data.suggestImport.fullName} importado(a) para este local.`);
              router.push(`/patients/${data.suggestImport.patientId}`);
            },
          },
        });
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Não foi possível cadastrar o paciente.");

      localStorage.removeItem(DRAFT_KEY);
      toast.success("Paciente cadastrado com sucesso!");
      router.push(`/patients/${data.patient.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const isLastStep = step === effectiveSteps.length - 1;

  return (
    <div className="space-y-6">
      <Stepper steps={effectiveSteps} currentStep={step} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="space-y-6 p-6 sm:p-8">
              {currentStepKey === "Dados pessoais" && (
                <div className="space-y-6">
                  {workplaces.length > 1 && (
                    <div>
                      <Label>Local de trabalho</Label>
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
                  )}

                  <ImageUpload
                    value={form.watch("photoUrl")}
                    onChange={(url) => form.setValue("photoUrl", url ?? "")}
                    uploadUrl="/api/uploads/logo"
                    fallbackIcon={<User className="h-6 w-6" />}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome social</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input {...field} onChange={(e) => field.onChange(formatCPFOrCNPJ(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Data de nascimento{" "}
                            {field.value && (
                              <span className="font-normal text-muted-foreground">
                                ({calculateAge(field.value)} anos)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sex"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sexo</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FEMALE">Feminino</SelectItem>
                              <SelectItem value="MALE">Masculino</SelectItem>
                              <SelectItem value="INTERSEX">Intersexo</SelectItem>
                              <SelectItem value="NOT_INFORMED">Prefiro não informar</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Identidade de gênero" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado civil</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MARITAL_STATUS_OPTIONS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profissão</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Escolaridade</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EDUCATION_OPTIONS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nacionalidade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {currentStepKey === "Contato" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                          <Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {currentStepKey === "Endereço" && <AddressFields />}

              {currentStepKey === "Responsável" && (
                <div className="space-y-6">
                  <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Paciente menor de idade — é obrigatório cadastrar pelo menos um responsável
                      legal para concluir o cadastro.
                    </p>
                  </div>

                  {guardianArray.fields.map((field, index) => (
                    <div key={field.id} className="space-y-4 rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Responsável {index + 1}</p>
                        {guardianArray.fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => guardianArray.remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`guardians.${index}.fullName`}
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Nome completo</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`guardians.${index}.relationship`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parentesco</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {GUARDIAN_RELATIONSHIP_OPTIONS.map((o) => (
                                    <SelectItem key={o} value={o}>
                                      {o}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`guardians.${index}.cpf`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF</FormLabel>
                              <FormControl>
                                <Input {...field} onChange={(e) => field.onChange(formatCPFOrCNPJ(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`guardians.${index}.phone`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`guardians.${index}.whatsapp`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp</FormLabel>
                              <FormControl>
                                <Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`guardians.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <AddressFields prefix={`guardians.${index}.`} />
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={() => guardianArray.append(emptyGuardian)}>
                    <Plus className="h-4 w-4" />
                    Adicionar outro responsável
                  </Button>
                  <FormMessage>{form.formState.errors.guardians?.root?.message}</FormMessage>
                </div>
              )}

              {currentStepKey === "Ficha inicial" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="record.mainComplaint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Queixa principal</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="record.reasonForVisit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo do atendimento</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="record.history"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Histórico</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="record.allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alergias</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="record.medications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicamentos em uso</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="record.goals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objetivos do acompanhamento</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {customFields.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <p className="text-sm font-semibold text-muted-foreground">Campos personalizados</p>
                        {customFields.map((cf) => (
                          <CustomFieldInput
                            key={cf.id}
                            field={cf}
                            value={form.watch("customFieldValues")?.[cf.id] ?? ""}
                            onChange={(v) =>
                              form.setValue("customFieldValues", {
                                ...form.getValues("customFieldValues"),
                                [cf.id]: v,
                              })
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {currentStepKey === "Revisão" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="howFoundUs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Como conheceu a empresa</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HOW_FOUND_US_OPTIONS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firstVisitDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data do primeiro atendimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(PATIENT_STATUS_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="generalNotes"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Observações gerais</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="font-medium">Resumo</p>
                    <dl className="mt-2 grid grid-cols-1 gap-y-1 sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Nome:</dt>
                        <dd>{form.watch("fullName") || "—"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Idade:</dt>
                        <dd>{birthDate ? `${calculateAge(birthDate)} anos` : "—"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Telefone:</dt>
                        <dd>{form.watch("phone") || form.watch("whatsapp") || "—"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground">Responsáveis:</dt>
                        <dd>{minor ? guardianArray.fields.length : "Não se aplica"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 0}>
              Voltar
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Cadastrar paciente
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Continuar
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
