"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkplaceSwitcher, type WorkplaceSummary } from "@/components/layout/workplace-switcher";
import type { CompanyRole } from "@prisma/client";

interface TopbarProps {
  onMobileMenuClick: () => void;
  workplaces: WorkplaceSummary[];
  activeWorkplaceId: string | null;
  activeWorkplaceName: string;
  activeWorkplaceColor: string | null;
  canManageWorkplaces: boolean;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  companyName: string;
  companyLogoUrl?: string | null;
  role: CompanyRole;
}

export function Topbar(props: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-3 sm:px-6">
      <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={props.onMobileMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <WorkplaceSwitcher
        workplaces={props.workplaces}
        activeWorkplaceId={props.activeWorkplaceId}
        activeWorkplaceName={props.activeWorkplaceName}
        activeWorkplaceColor={props.activeWorkplaceColor}
        canManage={props.canManageWorkplaces}
      />

      <div className="hidden flex-1 sm:block">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <div className="sm:hidden">
          <GlobalSearch compact />
        </div>
        <ThemeToggle />
        <NotificationBell />
        <div className="ml-1">
          <UserMenu
            userName={props.userName}
            userEmail={props.userEmail}
            userAvatarUrl={props.userAvatarUrl}
            companyName={props.companyName}
            companyLogoUrl={props.companyLogoUrl}
            role={props.role}
          />
        </div>
      </div>
    </header>
  );
}
