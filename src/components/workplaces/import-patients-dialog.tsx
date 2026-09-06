"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  targetWorkplaceId: string;
  otherWorkplaces: { id: string; name: string; color: string }[];
  onClose: () => void;
  onImported: () => void;
}

export function ImportPatientsDialog({ targetWorkplaceId, otherWorkplaces, onClose, onImported }: Props) {
  const [sourceWorkplaceId, setSourceWorkplaceId] = useState(otherWorkplaces[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<{ id: string; fullName: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourceWorkplaceId) return;
    setLoadingPatients(true);
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ workplaceId: sourceWorkplaceId, pageSize: "50" });
      if (query) params.set("q", query);
      const res = await fetch(`/api/patients?${params.toString()}`);
      const data = await res.json();
      setPatients(data.items ?? []);
      setLoadingPatients(false);
    }, 250);
    return () => clearTimeout(t);
  }, [sourceWorkplaceId, query]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um paciente.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/workplaces/${targetWorkplaceId}/import-patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceWorkplaceId, patientIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar.");
      toast.success(`${data.imported} paciente(s) importado(s).`);
      onImported();
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
          <DialogTitle>Importar pacientes</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={sourceWorkplaceId} onValueChange={setSourceWorkplaceId}>
            <SelectTrigger>
              <SelectValue placeholder="Importar de..." />
            </SelectTrigger>
            <SelectContent>
              {otherWorkplaces.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Pesquisar paciente" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {patients.length > 0 && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() =>
                setSelectedIds((prev) => (prev.size === patients.length ? new Set() : new Set(patients.map((p) => p.id))))
              }
            >
              {selectedIds.size === patients.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          )}

          <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin rounded-lg border border-border p-2">
            {loadingPatients ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : patients.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
            ) : (
              patients.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                    selectedIds.has(p.id) && "bg-accent"
                  )}
                >
                  <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                  {p.fullName}
                </label>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || selectedIds.size === 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar {selectedIds.size > 0 ? selectedIds.size : ""} paciente(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
