"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CalendarDays, Loader2 } from "lucide-react";
import { formatDateTimeBR, getInitials } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SearchResults {
  patients: { id: string; fullName: string; photoUrl: string | null; phone: string | null }[];
  appointments: {
    id: string;
    startsAt: string;
    type: string;
    status: string;
    patient: { fullName: string };
  }[];
}

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);

  if (compact && !mobileDialogOpen) {
    return (
      <Button variant="ghost" size="icon" onClick={() => setMobileDialogOpen(true)} aria-label="Buscar">
        <Search className="h-[18px] w-[18px]" />
      </Button>
    );
  }

  if (compact) {
    return (
      <Dialog open onOpenChange={(v) => !v && setMobileDialogOpen(false)}>
        <DialogContent className="top-24 max-w-md translate-y-0 p-3">
          <GlobalSearchInner onNavigate={() => setMobileDialogOpen(false)} autoFocus />
        </DialogContent>
      </Dialog>
    );
  }

  return <GlobalSearchInner />;
}

function GlobalSearchInner({ onNavigate, autoFocus }: { onNavigate?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const hasResults = results && (results.patients.length > 0 || results.appointments.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar pacientes, telefone, CPF, agendamentos..."
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-16 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          Ctrl K
        </kbd>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lg scrollbar-thin animate-in fade-in-0 zoom-in-95">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </div>
          )}

          {!loading && !hasResults && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
          )}

          {!loading && results && results.patients.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 text-xs font-medium uppercase text-muted-foreground">Pacientes</p>
              {results.patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onNavigate?.();
                    router.push(`/patients/${p.id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.photoUrl ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(p.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.fullName}</p>
                    {p.phone && <p className="truncate text-xs text-muted-foreground">{p.phone}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && results && results.appointments.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-medium uppercase text-muted-foreground">Agendamentos</p>
              {results.appointments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onNavigate?.();
                    router.push(`/agenda?appointment=${a.id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.patient.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTimeBR(a.startsAt)} · {a.type} ·{" "}
                      {APPOINTMENT_STATUS_LABELS[a.status]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
