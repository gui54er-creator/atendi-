"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { companySchema, type CompanyInput } from "@/lib/validations/company";
import { formatCPFOrCNPJ, formatPhone } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AddressFields } from "@/components/forms/address-fields";
import { ImageUpload } from "@/components/forms/image-upload";

export function CompanyTab({ company }: { company: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name ?? "",
      tradeName: company.tradeName ?? "",
      taxId: company.taxId ?? "",
      phone: company.phone ?? "",
      whatsapp: company.whatsapp ?? "",
      email: company.email ?? "",
      cep: company.cep ?? "",
      address: company.address ?? "",
      number: company.number ?? "",
      complement: company.complement ?? "",
      neighborhood: company.neighborhood ?? "",
      city: company.city ?? "",
      state: company.state ?? "",
      logoUrl: company.logoUrl ?? "",
    },
  });

  async function onSubmit(values: CompanyInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/companies/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar.");
      toast.success("Dados da empresa atualizados.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados da empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ImageUpload
              value={form.watch("logoUrl")}
              onChange={(url) => form.setValue("logoUrl", url ?? "")}
              uploadUrl="/api/uploads/logo"
              shape="square"
              fallbackIcon={<Building2 className="h-6 w-6" />}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome da empresa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tradeName" render={({ field }) => (
                <FormItem><FormLabel>Nome fantasia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="taxId" render={({ field }) => (
                <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatCPFOrCNPJ(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="whatsapp" render={({ field }) => (
                <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatPhone(e.target.value))} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <Separator />
            <AddressFields />
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
