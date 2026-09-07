"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import { TopicDialog, type Topic } from "./topic-dialog";

export function RecordTopics({ patientId, workplaceId }: { patientId: string; workplaceId: string }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Topic | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/record/topics?workplaceId=${workplaceId}`);
    const data = await res.json();
    setTopics(data.topics ?? []);
    setLoading(false);
  }, [patientId, workplaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/patients/${patientId}/record/topics/${deleteTarget.id}?workplaceId=${workplaceId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao excluir tópico.");
      toast.success("Tópico excluído.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Tópicos do prontuário</h3>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando tópicos...</p>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <Card key={topic.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold">{topic.title}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(topic)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(topic)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {topic.content ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{topic.content}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Sem conteúdo registrado.</p>
                )}
              </CardContent>
            </Card>
          ))}

          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border p-6 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">Adicionar tópico</span>
          </button>
        </div>
      )}

      {editing && (
        <TopicDialog
          patientId={patientId}
          workplaceId={workplaceId}
          topic={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tópico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O tópico "{deleteTarget?.title}" e seu conteúdo serão removidos
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
