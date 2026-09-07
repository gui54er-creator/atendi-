"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { CustomFieldInput, type CustomFieldDef } from "@/components/forms/custom-field-input";
import { RecordTopics } from "./record-topics";

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

export function RecordTab({
  patientId,
  activeLink,
  customFields,
}: {
  patientId: string;
  activeLink: any;
  customFields: CustomFieldDef[];
}) {
  const [loading, setLoading] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const v of activeLink.customFieldValues ?? []) {
      map[v.customFieldId] = v.value ?? "";
    }
    return map;
  });

  const form = useForm({
    defaultValues: {
      mainComplaint: activeLink.record?.mainComplaint ?? "",
      reasonForVisit: activeLink.record?.reasonForVisit ?? "",
      history: activeLink.record?.history ?? "",
      pastHistory: activeLink.record?.pastHistory ?? "",
      medications: activeLink.record?.medications ?? "",
      allergies: activeLink.record?.allergies ?? "",
      previousTreatments: activeLink.record?.previousTreatments ?? "",
      importantNotes: activeLink.record?.importantNotes ?? "",
      goals: activeLink.record?.goals ?? "",
    },
  });

  async function onSubmit(values: Record<string, string>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/record`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, workplaceId: activeLink.workplaceId, customFieldValues: customValues }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar prontuário.");
      toast.success("Prontuário atualizado.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <a href={`/patients/${patientId}/record/print?workplace=${activeLink.workplaceId}`} target="_blank" rel="noopener noreferrer">
            <Printer className="h-4 w-4" /> Imprimir prontuário
          </a>
        </Button>
      </div>

      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prontuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {RECORD_FIELDS.map((f) => (
              <FormField
                key={f.name}
                control={form.control}
                name={f.name as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.label}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {customFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos personalizados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customFields.map((cf) => (
                <CustomFieldInput
                  key={cf.id}
                  field={cf}
                  value={customValues[cf.id] ?? ""}
                  onChange={(v) => setCustomValues((prev) => ({ ...prev, [cf.id]: v }))}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar prontuário
          </Button>
        </div>
      </form>
      </Form>

      <Separator />

      <RecordTopics patientId={patientId} workplaceId={activeLink.workplaceId} />
    </div>
  );
}
