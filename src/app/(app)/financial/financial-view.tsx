"use client";

import { useEffect, useMemo, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Plus, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, TRANSACTION_STATUS_LABELS } from "@/lib/constants";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  description: string;
  amount: string;
  date: string;
  status: string;
  paymentMethod: string | null;
  category: { id: string; name: string } | null;
  patient: { id: string; fullName: string } | null;
}

const PERIODS = ["Hoje", "Esta semana", "Este mês", "Mês anterior", "Este ano", "Tudo"] as const;

function getPeriodRange(period: (typeof PERIODS)[number]) {
  const now = new Date();
  switch (period) {
    case "Hoje":
      return { from: now, to: now };
    case "Esta semana":
      return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) };
    case "Este mês":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "Mês anterior": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "Este ano":
      return { from: startOfYear(now), to: endOfYear(now) };
    default:
      return null;
  }
}

interface WorkplaceOption {
  id: string;
  name: string;
  color: string;
}

export function FinancialView({
  categories,
  canWrite,
  workplaces,
  activeWorkplaceId,
}: {
  categories: Category[];
  canWrite: boolean;
  workplaces: WorkplaceOption[];
  activeWorkplaceId: string | null;
}) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("Este mês");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogType, setDialogType] = useState<"INCOME" | "EXPENSE" | null>(null);

  const range = useMemo(() => getPeriodRange(period), [period]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (range) {
      params.set("dateFrom", range.from.toISOString());
      params.set("dateTo", range.to.toISOString());
    }
    const res = await fetch(`/api/transactions?${params.toString()}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const visible = typeFilter === "all" ? transactions : transactions.filter((t) => t.type === typeFilter);

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === "INCOME");
    const expense = transactions.filter((t) => t.type === "EXPENSE");
    const received = income.filter((t) => t.status === "PAID").reduce((s, t) => s + Number(t.amount), 0);
    const pending = income.filter((t) => t.status === "PENDING").reduce((s, t) => s + Number(t.amount), 0);
    const expenseTotal = expense
      .filter((t) => t.status !== "CANCELED")
      .reduce((s, t) => s + Number(t.amount), 0);
    return { received, pending, expenseTotal, profit: received - expenseTotal };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={ArrowUpCircle} label="Receita recebida" value={totals.received} tone="success" />
        <SummaryCard icon={Wallet} label="A receber" value={totals.pending} tone="warning" />
        <SummaryCard icon={ArrowDownCircle} label="Despesas" value={totals.expenseTotal} tone="destructive" />
        <SummaryCard icon={TrendingUp} label="Lucro líquido" value={totals.profit} tone="primary" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos lançamentos</SelectItem>
            <SelectItem value="INCOME">Receitas</SelectItem>
            <SelectItem value="EXPENSE">Despesas</SelectItem>
          </SelectContent>
        </Select>

        {canWrite && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialogType("EXPENSE")}>
              <Plus className="h-4 w-4" /> Nova despesa
            </Button>
            <Button size="sm" onClick={() => setDialogType("INCOME")}>
              <Plus className="h-4 w-4" /> Nova receita
            </Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Nenhum lançamento neste período.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {t.type === "INCOME" ? (
                        <ArrowUpCircle className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium">{t.description}</p>
                        {t.patient && <p className="text-xs text-muted-foreground">{t.patient.fullName}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{t.category?.name ?? "—"}</TableCell>
                  <TableCell>{formatDateBR(t.date)}</TableCell>
                  <TableCell className={t.type === "INCOME" ? "text-success" : "text-destructive"}>
                    {t.type === "EXPENSE" && "- "}
                    {formatCurrencyBRL(t.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={t.status === "PAID" ? "success" : t.status === "PENDING" ? "warning" : "secondary"}
                    >
                      {TRANSACTION_STATUS_LABELS[t.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {dialogType && (
        <TransactionDialog
          type={dialogType}
          categories={categories.filter((c) => c.type === dialogType)}
          workplaces={workplaces}
          defaultWorkplaceId={activeWorkplaceId ?? workplaces[0]?.id ?? ""}
          onClose={() => setDialogType(null)}
          onCreated={() => {
            setDialogType(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: number;
  tone: "success" | "warning" | "destructive" | "primary";
}) {
  const toneClasses = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  }[tone];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{formatCurrencyBRL(value)}</p>
        </div>
      </div>
    </Card>
  );
}

function TransactionDialog({
  type,
  categories,
  workplaces,
  defaultWorkplaceId,
  onClose,
  onCreated,
}: {
  type: "INCOME" | "EXPENSE";
  categories: Category[];
  workplaces: WorkplaceOption[];
  defaultWorkplaceId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [workplaceId, setWorkplaceId] = useState(defaultWorkplaceId);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState<string>("none");
  const [status, setStatus] = useState(type === "INCOME" ? "PENDING" : "PAID");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!description || !amount) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    if (!workplaceId) {
      toast.error("Selecione um local.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          workplaceId,
          description,
          amount: Number(amount),
          date,
          categoryId: categoryId === "none" ? null : categoryId,
          status,
          paymentMethod: type === "INCOME" ? paymentMethod : null,
          isRecurring,
          notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar.");
      toast.success(type === "INCOME" ? "Receita registrada." : "Despesa registrada.");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "INCOME" ? "Nova receita" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {workplaces.length > 1 && (
            <Select value={workplaceId} onValueChange={setWorkplaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Local" />
              </SelectTrigger>
              <SelectContent>
                {workplaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color }} />
                      {w.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {type === "INCOME" && (
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSACTION_STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {type === "EXPENSE" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              Despesa recorrente (repete todo mês)
            </label>
          )}

          <Input placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
