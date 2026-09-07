"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface Topic {
  id: string;
  title: string;
  content: string | null;
}

export function TopicDialog({
  patientId,
  workplaceId,
  topic,
  onClose,
  onSaved,
}: {
  patientId: string;
  workplaceId: string;
  topic?: Topic | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(topic?.title ?? "");
  const [content, setContent] = useState(topic?.content ?? "");
  const [loading, setLoading] = useState(false);
  const isEditing = !!topic;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe um título para o tópico.");
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `/api/patients/${patientId}/record/topics/${topic!.id}`
        : `/api/patients/${patientId}/record/topics`;
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workplaceId, title, content }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar tópico.");
      toast.success(isEditing ? "Tópico atualizado." : "Tópico criado.");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar tópico" : "Novo tópico"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="topic-title">Título</Label>
            <Input
              id="topic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Anamnese, Evolução, Observações..."
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-content">Conteúdo</Label>
            <Textarea
              id="topic-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
          </div>

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
      </DialogContent>
    </Dialog>
  );
}
