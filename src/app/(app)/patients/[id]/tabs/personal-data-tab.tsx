"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, User } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AddressFields } from "@/components/forms/address-fields";
import { ImageUpload } from "@/components/forms/image-upload";

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function PersonalDataTab({ patient, activeLink }: { patient: any; activeLink: any }) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PatientInput>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      photoUrl: patient.photoUrl ?? "",
      fullName: patient.fullName ?? "",
      socialName: patient.socialName ?? "",
      cpf: patient.cpf ?? "",
      rg: patient.rg ?? "",
      birthDate: toDateInput(patient.birthDate),
      sex: patient.sex ?? "NOT_INFORMED",
      gender: patient.gender ?? "",
      maritalStatus: patient.maritalStatus ?? "",
      profession: patient.profession ?? "",
      education: patient.education ?? "",
      nationality: patient.nationality ?? "",
      phone: patient.phone ?? "",
      whatsapp: patient.whatsapp ?? "",
      email: patient.email ?? "",
      cep: patient.cep ?? "",
      address: patient.address ?? "",
      number: patient.number ?? "",
      complement: patient.complement ?? "",
      neighborhood: patient.neighborhood ?? "",
      city: patient.city ?? "",
      state: patient.state ?? "",
      howFoundUs: activeLink.howFoundUs ?? "",
      generalNotes: patient.generalNotes ?? "",
      firstVisitDate: toDateInput(activeLink.joinedAt),
      status: activeLink.status ?? "ACTIVE",
      guardians: (patient.guardians ?? []).map((g: any) => ({
        id: g.id,
        fullName: g.fullName ?? "",
        relationship: g.relationship ?? "",
        cpf: g.cpf ?? "",
        phone: g.phone ?? "",
        whatsapp: g.whatsapp ?? "",
        email: g.email ?? "",
        cep: g.cep ?? "",
        address: g.address ?? "",
        number: g.number ?? "",
        complement: g.complement ?? "",
        neighborhood: g.neighborhood ?? "",
        city: g.city ?? "",
        state: g.state ?? "",
      })),
    },
  });

  const guardianArray = useFieldArray({ control: form.control, name: "guardians" });
  const birthDate = form.watch("birthDate");
  const minor = birthDate ? isMinor(birthDate) : false;

  async function onSubmit(values: PatientInput) {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}?workplaceId=${activeLink.workplaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar.");
      toast.success("Dados atualizados.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ImageUpload
              value={form.watch("photoUrl")}
              onChange={(url) => form.setValue("photoUrl", url ?? "")}
              uploadUrl="/api/uploads/logo"
              fallbackIcon={<User className="h-6 w-6" />}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem className="sm:col-span-2"><FormLabel>Nome completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="socialName" render={({ field }) => (
                <FormItem><FormLabel>Nome social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cpf" render={({ field }) => (
                <FormItem><FormLabel>CPF</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatCPFOrCNPJ(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="rg" render={({ field }) => (
                <FormItem><FormLabel>RG</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento {field.value && <span className="font-normal text-muted-foreground">({calculateAge(field.value)} anos)</span>}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="FEMALE">Feminino</SelectItem>
                      <SelectItem value="MALE">Masculino</SelectItem>
                      <SelectItem value="INTERSEX">Intersexo</SelectItem>
                      <SelectItem value="NOT_INFORMED">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem><FormLabel>Gênero</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado civil</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{MARITAL_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="profession" render={({ field }) => (
                <FormItem><FormLabel>Profissão</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="education" render={({ field }) => (
                <FormItem>
                  <FormLabel>Escolaridade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{EDUCATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nationality" render={({ field }) => (
                <FormItem><FormLabel>Nacionalidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{Object.entries(PATIENT_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="whatsapp" render={({ field }) => (
              <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent><AddressFields /></CardContent>
        </Card>

        {minor && (
          <Card>
            <CardHeader><CardTitle className="text-base">Responsáveis</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {guardianArray.fields.map((field, index) => (
                <div key={field.id} className="space-y-4 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Responsável {index + 1}</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => guardianArray.remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name={`guardians.${index}.fullName`} render={({ field }) => (
                      <FormItem className="sm:col-span-2"><FormLabel>Nome completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`guardians.${index}.relationship`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parentesco</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                          <SelectContent>{GUARDIAN_RELATIONSHIP_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`guardians.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <AddressFields prefix={`guardians.${index}.`} />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  guardianArray.append({
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
                  })
                }
              >
                <Plus className="h-4 w-4" /> Adicionar responsável
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Informações adicionais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="howFoundUs" render={({ field }) => (
              <FormItem>
                <FormLabel>Como conheceu a empresa</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>{HOW_FOUND_US_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="firstVisitDate" render={({ field }) => (
              <FormItem><FormLabel>Data do primeiro atendimento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="generalNotes" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Observações gerais</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}
