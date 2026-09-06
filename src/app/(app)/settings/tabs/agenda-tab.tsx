"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WEEKDAY_LABELS_FULL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AgendaTab({ company }: { company: any }) {
  const router = useRouter();
  const [startTime, setStartTime] = useState(company.agendaStartTime ?? "08:00");
  const [endTime, setEndTime] = useState(company.agendaEndTime ?? "19:00");
  const [duration, setDuration] = useState(String(company.defaultDurationMinutes ?? 60));
  const [workingDays, setWorkingDays] = useState<number[]>(company.workingDays ?? [1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(false);

  function toggleDay(day: number) {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/companies/agenda-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agendaStartTime: startTime,
          agendaEndTime: endTime,
          defaultDurationMinutes: Number(duration),
          workingDays,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar.");
      toast.success("Configurações da agenda atualizadas.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configurações da agenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Horário inicial</Label>
            <Input type="time" className="mt-1.5" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <Label>Horário final</Label>
            <Input type="time" className="mt-1.5" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div>
            <Label>Duração padrão do atendimento</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Dias de funcionamento</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_LABELS_FULL.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  workingDays.includes(i)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
