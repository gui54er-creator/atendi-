"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, HeartPulse, MailCheck } from "lucide-react";
import { z } from "zod";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type Input = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const form = useForm<Input>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Input) {
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setSent(true);
    if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-semibold">Verifique seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
        </p>

        {devResetUrl && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-left text-xs text-warning-foreground">
            <p className="mb-1 font-medium">Modo desenvolvimento</p>
            <p className="mb-2">
              O envio de e-mail ainda não está configurado neste ambiente. Use o link abaixo para
              testar o fluxo:
            </p>
            <Link href={devResetUrl} className="break-all font-medium text-primary underline">
              {devResetUrl}
            </Link>
          </div>
        )}

        <Link href="/login" className="inline-block text-sm font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 lg:hidden">
        <div className="flex items-center gap-2 text-lg font-semibold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <HeartPulse className="h-5 w-5" />
          </span>
          Atendi+
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Recuperar senha</h2>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input placeholder="voce@empresa.com" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar link de recuperação
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
