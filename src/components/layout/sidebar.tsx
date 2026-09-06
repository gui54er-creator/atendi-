"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, HeartPulse, X } from "lucide-react";
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from "@/lib/nav";
import { can, type PermissionContext } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  permissionContext: PermissionContext;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose, permissionContext }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => can(permissionContext, item.capability));

  function renderItem(item: (typeof NAV_ITEMS)[number]) {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onMobileClose}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground shadow-soft"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-in fade-in-0"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 ease-in-out",
          collapsed ? "lg:w-20" : "lg:w-60",
          mobileOpen ? "w-60 translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HeartPulse className="h-5 w-5" />
            </span>
            {!collapsed && <span className="truncate text-base font-semibold">Atendi+</span>}
          </div>
          <button
            onClick={onMobileClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 py-2">
          {visibleItems.map(renderItem)}
        </nav>

        <div className="space-y-1 px-3 pb-3">
          {can(permissionContext, SETTINGS_NAV_ITEM.capability) && renderItem(SETTINGS_NAV_ITEM)}
        </div>

        <button
          onClick={onToggleCollapse}
          className="hidden items-center justify-center gap-2 border-t border-sidebar-border py-3 text-xs text-muted-foreground hover:bg-sidebar-accent lg:flex"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && "Recolher menu"}
        </button>
      </aside>
    </>
  );
}
