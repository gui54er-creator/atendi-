"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeBR } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  "company.created": "Empresa criada",
  "patient.created": "Paciente criado",
  "patient.updated": "Paciente atualizado",
  "patient.deleted": "Paciente removido",
  "patient.record_updated": "Prontuário atualizado",
  "appointment.created": "Atendimento agendado",
  "appointment.updated": "Atendimento atualizado",
  "appointment.deleted": "Atendimento excluído",
  "appointment.note_added": "Anotação adicionada",
  "file.added": "Arquivo adicionado",
  "file.deleted": "Arquivo removido",
  "transaction.created": "Lançamento financeiro criado",
  "transaction.updated": "Lançamento financeiro atualizado",
  "transaction.deleted": "Lançamento financeiro removido",
  "member.invited": "Usuário convidado",
  "member.role_changed": "Permissão alterada",
  "settings.updated": "Configurações atualizadas",
};

export function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((res) => res.json())
      .then((data) => setLogs(data.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log de auditoria</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <History className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{log.user?.name ?? "Sistema"}</span>{" "}
                    {(ACTION_LABELS[log.action] ?? log.action).toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTimeBR(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
