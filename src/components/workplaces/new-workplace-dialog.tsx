"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { WORKPLACE_COLOR_PRESETS } from "@/lib/validations/workplace";

interface Props {
  existingWorkplaces: { id: string; name: string; color: string }[];
  onClose: () => void;
  onCreated: () => void;
}

type Step = "basics" | "import-choice" | "import-select";

export function NewWorkplaceDialog({ existingWorkplaces, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>("basics");
  const [name, setName] = useState("");
  const [color, setColor] = useState(WORKPLACE_COLOR_PRESETS[0]!);
  const [loading, setLoading] = useState(false);

  const [sourceWorkplaceId, setSourceWorkplaceId] = useState(existingWorkplaces[0]?.id ?? "");
  const [patientQuery, setPatientQuery] = useState("");
  const [sourcePatients, setSourcePatients] = useState<{ id: string; fullName: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    if (step !== "import-select" || !sourceWorkplaceId) return;
    setLoadingPatients(true);
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ workplaceId: sourceWorkplaceId, pageSize: "50" });
      if (patientQuery) params.set("q", patientQuery);
      const res = await fetch(`/api/patients?${params.toString()}`);
      const data = await res.json();
      setSourcePatients(data.items ?? []);
      setLoadingPatients(false);
    }, 250);
    return () => clearTimeout(t);
  }, [step, sourceWorkplaceId, patientQuery]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Informe um nome para o local.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/workplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color,
          ...(selectedIds.size > 0
            ? { importFromWorkplaceId: sourceWorkplaceId, importPatientIds: Array.from(selectedIds) }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar local.");
      toast.success(
        data.imported > 0 ? `Local criado com ${data.imported} paciente(s) importado(s).` : "Local criado."
      );
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar local</DialogTitle>
        </DialogHeader>

        {step === "basics" && (
          <div className="space-y-5">
            <div>
              <Label>Nome do local</Label>
              <Input
                className="mt-1.5"
                placeholder="Ex: Clínica Central"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {WORKPLACE_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition-transform hover:scale-105"
                    style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  >
                    {color === c && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
                <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-0 w-0 opacity-0"
                  />
                  +
                </label>
              </div>
            </div>

            {existingWorkplaces.length > 0 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">Deseja importar pacientes de outro local?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Os dados básicos são compartilhados — nada é duplicado.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={submit} disabled={loading}>
                    Agora não
                  </Button>
                  <Button type="button" size="sm" onClick={() => setStep("import-choice")}>
                    Importar pacientes
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "import-choice" && (
          <div className="space-y-4">
            <div>
              <Label>Importar de</Label>
              <Select value={sourceWorkplaceId} onValueChange={setSourceWorkplaceId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {existingWorkplaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("basics")}>
                Voltar
              </Button>
              <Button onClick={() => setStep("import-select")}>Continuar</Button>
            </DialogFooter>
          </div>
        )}

        {step === "import-select" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Pesquisar paciente"
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
              />
            </div>

            {sourcePatients.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() =>
                  setSelectedIds((prev) =>
                    prev.size === sourcePatients.length ? new Set() : new Set(sourcePatients.map((p) => p.id))
                  )
                }
              >
                {selectedIds.size === sourcePatients.length ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            )}

            <div className="max-h-56 space-y-1 overflow-y-auto scrollbar-thin rounded-lg border border-border p-2">
              {loadingPatients ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
              ) : sourcePatients.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
              ) : (
                sourcePatients.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                      selectedIds.has(p.id) && "bg-accent"
                    )}
                  >
                    <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelected(p.id)} />
                    {p.fullName}
                  </label>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("import-choice")}>
                Voltar
              </Button>
              <Button onClick={submit} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar local e importar {selectedIds.size > 0 ? selectedIds.size : ""} paciente(s)
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
