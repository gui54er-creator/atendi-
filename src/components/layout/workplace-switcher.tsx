"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewWorkplaceDialog } from "@/components/workplaces/new-workplace-dialog";

export interface WorkplaceSummary {
  id: string;
  name: string;
  color: string;
}

export function WorkplaceSwitcher({
  workplaces,
  activeWorkplaceId,
  activeWorkplaceName,
  activeWorkplaceColor,
  canManage,
}: {
  workplaces: WorkplaceSummary[];
  activeWorkplaceId: string | null;
  activeWorkplaceName: string;
  activeWorkplaceColor: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  async function switchTo(workplaceId: string | null) {
    if (switching) return;
    setSwitching(true);
    try {
      await fetch("/api/workplaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workplaceId }),
      });
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-10 min-w-0 max-w-[120px] shrink items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-soft transition-colors hover:bg-accent disabled:opacity-60 sm:max-w-[240px]"
            disabled={switching}
          >
            {activeWorkplaceColor ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: activeWorkplaceColor }}
              />
            ) : (
              <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 truncate">{activeWorkplaceName}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {workplaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => switchTo(w.id)} className="gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: w.color }} />
              <span className="flex-1 truncate">{w.name}</span>
              {activeWorkplaceId === w.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => switchTo(null)} className="gap-2">
            <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">Todos os locais</span>
            {activeWorkplaceId === null && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setNewOpen(true)} className="gap-2 text-primary">
                <Plus className="h-4 w-4" />
                Adicionar local
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {newOpen && (
        <NewWorkplaceDialog
          existingWorkplaces={workplaces}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
