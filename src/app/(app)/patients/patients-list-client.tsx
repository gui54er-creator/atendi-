"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, ChevronLeft, ChevronRight, Users2, ArrowUpDown, Upload } from "lucide-react";
import { ImportPatientsDialog } from "@/components/workplaces/import-patients-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { calculateAge, formatDateBR, getInitials } from "@/lib/utils";
import { PATIENT_STATUS_BADGE, PATIENT_STATUS_LABELS } from "@/lib/constants";

interface PatientListItem {
  id: string;
  photoUrl: string | null;
  fullName: string;
  birthDate: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: string;
  workplaces: { id: string; name: string; color: string }[];
  lastAppointment: string | null;
  nextAppointment: string | null;
}

interface WorkplaceOption {
  id: string;
  name: string;
  color: string;
}

export function PatientsListClient({
  workplaces,
  activeWorkplaceId,
}: {
  workplaces: WorkplaceOption[];
  activeWorkplaceId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const q = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(q);
  const status = searchParams.get("status") ?? "all";
  const sortBy = searchParams.get("sortBy") ?? "fullName";
  const sortDir = searchParams.get("sortDir") ?? "asc";
  const page = Number(searchParams.get("page") ?? 1);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in updates)) params.delete("page");
      router.push(`/patients?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) updateParams({ q: searchInput });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(page));

    fetch(`/api/patients?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [q, status, sortBy, sortDir, page, refreshKey]);

  function toggleSort(field: string) {
    if (sortBy === field) {
      updateParams({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sortBy: field, sortDir: "asc" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${total} paciente${total === 1 ? "" : "s"} cadastrado${total === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeWorkplaceId && workplaces.filter((w) => w.id !== activeWorkplaceId).length > 0 && (
            <Button variant="outline" size="lg" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar pacientes
            </Button>
          )}
          <Button asChild size="lg">
            <Link href="/patients/new">
              <Plus className="h-4 w-4" />
              Novo paciente
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            placeholder="Buscar por nome, telefone ou CPF..."
            className="pl-9"
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <Select value={status} onValueChange={(v) => updateParams({ status: v })}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(PATIENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users2 className="h-7 w-7" />
          </span>
          <div>
            <p className="font-medium">Nenhum paciente encontrado</p>
            <p className="text-sm text-muted-foreground">
              {q || status !== "all"
                ? "Tente ajustar os filtros de busca."
                : "Comece cadastrando o primeiro paciente."}
            </p>
          </div>
          {!q && status === "all" && (
            <Button asChild>
              <Link href="/patients/new">
                <Plus className="h-4 w-4" />
                Novo paciente
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="hidden overflow-hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => toggleSort("fullName")}>
                      Paciente <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => toggleSort("birthDate")}>
                      Idade <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Última consulta</TableHead>
                  <TableHead>Próxima consulta</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/patients/${p.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={p.photoUrl ?? undefined} />
                          <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.fullName}</span>
                        {!activeWorkplaceId &&
                          p.workplaces.map((w) => (
                            <span
                              key={w.id}
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: w.color }}
                              title={w.name}
                            />
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>{p.birthDate ? `${calculateAge(p.birthDate)} anos` : "—"}</TableCell>
                    <TableCell>{p.phone || p.whatsapp || "—"}</TableCell>
                    <TableCell>{p.lastAppointment ? formatDateBR(p.lastAppointment) : "—"}</TableCell>
                    <TableCell>{p.nextAppointment ? formatDateBR(p.nextAppointment) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={PATIENT_STATUS_BADGE[p.status]}>
                        {PATIENT_STATUS_LABELS[p.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile: cards */}
          <div className="space-y-3 sm:hidden">
            {items.map((p) => (
              <Card
                key={p.id}
                className="flex items-center gap-3 p-4"
                onClick={() => router.push(`/patients/${p.id}`)}
              >
                <Avatar className="h-11 w-11">
                  <AvatarImage src={p.photoUrl ?? undefined} />
                  <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.birthDate ? `${calculateAge(p.birthDate)} anos · ` : ""}
                    {p.phone || p.whatsapp || "Sem telefone"}
                  </p>
                </div>
                <Badge variant={PATIENT_STATUS_BADGE[p.status]}>{PATIENT_STATUS_LABELS[p.status]}</Badge>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {importOpen && activeWorkplaceId && (
        <ImportPatientsDialog
          targetWorkplaceId={activeWorkplaceId}
          otherWorkplaces={workplaces.filter((w) => w.id !== activeWorkplaceId)}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
