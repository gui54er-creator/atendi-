"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "PROFESSIONAL" | "RECEPTIONIST";
  status: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

export function UsersTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/company-members");
    const data = await res.json();
    setMembers(data.members ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function changeRole(memberId: string, role: string) {
    await fetch(`/api/company-members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/company-members/${memberId}`, { method: "DELETE" });
    toast.success("Membro removido.");
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Usuários da empresa</CardTitle>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Convidar
            </Button>
          </DialogTrigger>
          <InviteDialog
            onInvited={() => {
              setInviteOpen(false);
              load();
            }}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.user.avatarUrl ?? undefined} />
                  <AvatarFallback>{getInitials(m.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                {m.status === "INVITED" && (
                  <Badge variant="warning" className="shrink-0">
                    Convidado
                  </Badge>
                )}
                {m.role === "OWNER" ? (
                  <Badge className="shrink-0">Proprietário</Badge>
                ) : (
                  <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["ADMIN", "PROFESSIONAL", "RECEPTIONIST"] as const).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {m.role !== "OWNER" && (
                  <Button variant="ghost" size="icon" onClick={() => removeMember(m.id)}>
                    <UserX className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InviteDialog({ onInvited }: { onInvited: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("PROFESSIONAL");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/company-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao convidar.");
      if (data.devInviteUrl) {
        setInviteUrl(data.devInviteUrl);
      } else {
        toast.success("Convite enviado.");
        onInvited();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (inviteUrl) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convite criado</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <p className="mb-2">
            O envio de e-mail ainda não está configurado neste ambiente. Compartilhe este link manualmente
            com o convidado para que ele defina a senha:
          </p>
          <p className="break-all font-medium text-primary">{inviteUrl}</p>
        </div>
        <DialogFooter>
          <Button onClick={onInvited}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Convidar usuário</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <Input placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Administrador</SelectItem>
            <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
            <SelectItem value="RECEPTIONIST">Recepcionista</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={loading || !name || !email}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Enviar convite
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
