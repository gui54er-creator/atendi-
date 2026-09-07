"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ patientId }: { patientId: string }) {
  const router = useRouter();

  return (
    <div className="print-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/patients/${patientId}`)}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Imprimir
      </Button>
    </div>
  );
}
