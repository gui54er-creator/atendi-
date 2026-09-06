"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import type { PermissionContext } from "@/lib/permissions";
import type { CompanyRole } from "@prisma/client";
import type { WorkplaceSummary } from "@/components/layout/workplace-switcher";

interface AppShellProps {
  children: React.ReactNode;
  companyName: string;
  companyLogoUrl?: string | null;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  role: CompanyRole;
  permissionContext: PermissionContext;
  workplaces: WorkplaceSummary[];
  activeWorkplaceId: string | null;
  activeWorkplaceName: string;
  activeWorkplaceColor: string | null;
  canManageWorkplaces: boolean;
}

export function AppShell({ children, ...ctx }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("atendi:sidebar-collapsed");
    if (stored) setCollapsed(stored === "true");
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      localStorage.setItem("atendi:sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        permissionContext={ctx.permissionContext}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-60")}>
        <Topbar
          onMobileMenuClick={() => setMobileOpen(true)}
          workplaces={ctx.workplaces}
          activeWorkplaceId={ctx.activeWorkplaceId}
          activeWorkplaceName={ctx.activeWorkplaceName}
          activeWorkplaceColor={ctx.activeWorkplaceColor}
          canManageWorkplaces={ctx.canManageWorkplaces}
          userName={ctx.userName}
          userEmail={ctx.userEmail}
          userAvatarUrl={ctx.userAvatarUrl}
          companyName={ctx.companyName}
          companyLogoUrl={ctx.companyLogoUrl}
          role={ctx.role}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
