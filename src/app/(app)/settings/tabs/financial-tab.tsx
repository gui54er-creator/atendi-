"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

export function FinancialSettingsTab({ company }: { company: any }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [receptionistAccess, setReceptionistAccess] = useState(company.receptionistFinancialAccess);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/expense-categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory() {
    if (!newCategory.trim()) return;
    await fetch("/api/expense-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory, type: newCategoryType }),
    });
    setNewCategory("");
    load();
  }

  async function removeCategory(id: string) {
    await fetch(`/api/expense-categories/${id}`, { method: "DELETE" });
    load();
  }

  async function saveAccessToggle(value: boolean) {
    setReceptionistAccess(value);
    setLoading(true);
    try {
      const res = await fetch("/api/companies/financial-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receptionistFinancialAccess: value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Configuração atualizada.");
    } catch {
      toast.error("Erro ao salvar.");
      setReceptionistAccess(!value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Moeda</Label>
            <Input className="mt-1.5 w-40" value="Real Brasileiro (R$)" disabled />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Recepcionistas podem ver o financeiro</p>
              <p className="text-xs text-muted-foreground">
                Por padrão, recepcionistas não têm acesso a valores e pagamentos.
              </p>
            </div>
            <Switch checked={receptionistAccess} onCheckedChange={saveAccessToggle} disabled={loading} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova categoria"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <div className="flex rounded-lg border border-border p-0.5">
              {(["EXPENSE", "INCOME"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewCategoryType(t)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    newCategoryType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t === "EXPENSE" ? "Despesa" : "Receita"}
                </button>
              ))}
            </div>
            <Button onClick={addCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} variant="outline" className="gap-1.5 py-1.5 pl-3 pr-1.5">
                {c.name}
                <button onClick={() => removeCategory(c.id)} className="rounded-full p-0.5 hover:bg-muted">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formas de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.values(PAYMENT_METHOD_LABELS).map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
