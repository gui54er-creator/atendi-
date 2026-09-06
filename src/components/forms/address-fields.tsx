"use client";

import { useFormContext } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { formatCEP } from "@/lib/utils";
import { BRAZILIAN_STATES } from "@/lib/constants";

// Bloco de endereço reutilizado em empresa, paciente e responsáveis — todos
// pedem os mesmos campos com preenchimento automático por CEP (ViaCEP).
// `prefix` permite embutir dentro de um array do react-hook-form, ex:
// "guardians.0."
export function AddressFields({ prefix = "" }: { prefix?: string }) {
  const { control, setValue } = useFormContext();
  const { search, loading } = useCepLookup();

  const name = (field: string) => `${prefix}${field}`;

  async function handleCepBlur(value: string) {
    const result = await search(value);
    if (result) {
      setValue(name("address"), result.logradouro, { shouldValidate: true });
      setValue(name("neighborhood"), result.bairro, { shouldValidate: true });
      setValue(name("city"), result.localidade, { shouldValidate: true });
      setValue(name("state"), result.uf, { shouldValidate: true });
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
      <FormField
        control={control}
        name={name("cep")}
        render={({ field: f }) => (
          <FormItem className="col-span-2">
            <FormLabel>CEP</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...f}
                  value={f.value ?? ""}
                  placeholder="00000-000"
                  onChange={(e) => f.onChange(formatCEP(e.target.value))}
                  onBlur={(e) => {
                    f.onBlur();
                    handleCepBlur(e.target.value);
                  }}
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={name("address")}
        render={({ field: f }) => (
          <FormItem className="col-span-4">
            <FormLabel>Endereço</FormLabel>
            <FormControl>
              <Input {...f} value={f.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={name("number")}
        render={({ field: f }) => (
          <FormItem className="col-span-2 sm:col-span-1">
            <FormLabel>Número</FormLabel>
            <FormControl>
              <Input {...f} value={f.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={name("complement")}
        render={({ field: f }) => (
          <FormItem className="col-span-4 sm:col-span-3">
            <FormLabel>Complemento</FormLabel>
            <FormControl>
              <Input {...f} value={f.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={name("neighborhood")}
        render={({ field: f }) => (
          <FormItem className="col-span-3 sm:col-span-2">
            <FormLabel>Bairro</FormLabel>
            <FormControl>
              <Input {...f} value={f.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={name("city")}
        render={({ field: f }) => (
          <FormItem className="col-span-3">
            <FormLabel>Cidade</FormLabel>
            <FormControl>
              <Input {...f} value={f.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={name("state")}
        render={({ field: f }) => (
          <FormItem className="col-span-2 sm:col-span-1">
            <FormLabel>UF</FormLabel>
            <Select onValueChange={f.onChange} value={f.value ?? ""}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {BRAZILIAN_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
