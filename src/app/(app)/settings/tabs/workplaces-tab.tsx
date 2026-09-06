"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { AddressFields } from "@/components/forms/address-fields";
import { NewWorkplaceDialog } from "@/components/workplaces/new-workplace-dialog";
import { WORKPLACE_COLOR_PRESETS } from "@/lib/validations/workplace";
import { Check } from "lucide-react";

interface Workplace {
  id: string;
  name: string;
  type: string | null;
  color: string;
  isDefault: boolean;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  notes: string | null;
}

export function WorkplacesTab() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [deleting, setDeleting] = useState<Workplace | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/workplaces");
    const data = await res.json();
    setWorkplaces(data.workplaces ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/workplaces/${deleting.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Erro ao remover local.");
    } else {
      toast.success("Local removido.");
      load();
    }
    setDeleting(null);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Locais de trabalho</CardTitle>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar local
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {workplaces.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${w.color}22` }}>
                  <MapPin className="h-4 w-4" style={{ color: w.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {w.name}
                    {w.isDefault && <Star className="h-3 w-3 fill-warning text-warning" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[w.address, w.city].filter(Boolean).join(", ") || w.type || "Sem endereço cadastrado"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(w)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(w)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {newOpen && (
        <NewWorkplaceDialog
          existingWorkplaces={workplaces}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            load();
          }}
        />
      )}

      {editing && (
        <EditWorkplaceDialog
          workplace={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados de pacientes, agenda e financeiro deste local não são apagados, mas ele deixa de
              aparecer no seletor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function EditWorkplaceDialog({
  workplace,
  onClose,
  onSaved,
}: {
  workplace: Workplace;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(workplace.color);
  const form = useForm({
    defaultValues: {
      name: workplace.name,
      type: workplace.type ?? "",
      phone: workplace.phone ?? "",
      cep: workplace.cep ?? "",
      address: workplace.address ?? "",
      number: workplace.number ?? "",
      complement: workplace.complement ?? "",
      neighborhood: workplace.neighborhood ?? "",
      city: workplace.city ?? "",
      state: workplace.state ?? "",
      notes: workplace.notes ?? "",
    },
  });

  async function onSubmit(values: any) {
    setLoading(true);
    try {
      const res = await fetch(`/api/workplaces/${workplace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, color }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar.");
      toast.success("Local atualizado.");
      onSaved();
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
          <DialogTitle>Editar local</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div>
              <Label>Cor</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {WORKPLACE_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                  >
                    {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <AddressFields />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
