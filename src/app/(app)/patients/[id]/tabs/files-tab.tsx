"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateBR } from "@/lib/utils";
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

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  description: string | null;
  createdAt: string;
  uploadedBy: { name: string };
}

export function FilesTab({ patientId, workplaceId }: { patientId: string; workplaceId: string }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/patients/${patientId}/files?workplaceId=${workplaceId}`);
    const data = await res.json();
    setFiles(data.files ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, workplaceId]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workplaceId", workplaceId);
      try {
        const res = await fetch(`/api/patients/${patientId}/files`, { method: "POST", body: formData });
        if (!res.ok) throw new Error((await res.json()).error);
      } catch (err) {
        toast.error(`Falha ao enviar ${file.name}: ${(err as Error).message}`);
      }
    }
    setUploading(false);
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/files/${deleteTarget.id}`, { method: "DELETE" });
    toast.success("Arquivo removido.");
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleUpload(e.dataTransfer.files);
        }}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          Arraste arquivos aqui ou{" "}
          <button className="font-medium text-primary hover:underline" onClick={() => inputRef.current?.click()}>
            selecione do computador
          </button>
        </p>
        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP ou PDF — até 10MB</p>
        <Input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando arquivos...</p>
      ) : files.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <Card key={file.id} className="group relative overflow-hidden">
              <button
                className="flex h-32 w-full items-center justify-center bg-muted"
                onClick={() => setPreview(file)}
              >
                {file.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${file.id}`} alt={file.filename} className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-10 w-10 text-muted-foreground" />
                )}
              </button>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{file.filename}</p>
                <p className="text-[10px] text-muted-foreground">{formatDateBR(file.createdAt)}</p>
              </div>
              <button
                onClick={() => setDeleteTarget(file)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <button className="absolute right-4 top-4 text-white" onClick={() => setPreview(null)}>
            <X className="h-6 w-6" />
          </button>
          {preview.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${preview.id}`}
              alt={preview.filename}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <iframe
              src={`/api/files/${preview.id}`}
              className="h-[90vh] w-[90vw] rounded-lg bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
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
    </div>
  );
}
