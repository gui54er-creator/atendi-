"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { TRANSACTION_STATUS_LABELS } from "@/lib/constants";

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  status: string;
  type: string;
}

export function FinancialTab({ patientId, workplaceId }: { patientId: string; workplaceId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/transactions?patientId=${patientId}&workplaceId=${workplaceId}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, workplaceId]);

  const totalPaid = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PAID")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPending = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PENDING")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total recebido</p>
          <p className="text-lg font-semibold text-success">{formatCurrencyBRL(totalPaid)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-lg font-semibold text-warning-foreground">{formatCurrencyBRL(totalPending)}</p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" /> Nova receita
            </Button>
          </DialogTrigger>
          <NewTransactionDialog
            patientId={patientId}
            workplaceId={workplaceId}
            onCreated={() => {
              setOpen(false);
              load();
            }}
          />
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : transactions.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="h-6 w-6" />
          </span>
          <p className="font-medium">Nenhum lançamento financeiro</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-muted-foreground">{formatDateBR(t.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrencyBRL(t.amount)}</span>
                <Badge variant={t.status === "PAID" ? "success" : t.status === "PENDING" ? "warning" : "secondary"}>
                  {TRANSACTION_STATUS_LABELS[t.status]}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTransactionDialog({
  patientId,
  workplaceId,
  onCreated,
}: {
  patientId: string;
  workplaceId: string;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          description,
          amount: Number(amount),
          date,
          status,
          patientId,
          workplaceId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar.");
      toast.success("Receita registrada.");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova receita</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input
          type="number"
          step="0.01"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={loading || !description || !amount}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
