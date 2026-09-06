import { LayoutDashboard, CalendarDays, Users, Wallet, Settings } from "lucide-react";
import type { Capability } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  capability: Capability;
}

// Navegação principal enxuta — funcionalidades secundárias (notificações,
// campos personalizados, usuários, auditoria...) vivem dentro das páginas
// correspondentes, não como itens próprios do menu.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard, capability: "dashboard:read" },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, capability: "agenda:read" },
  { href: "/patients", label: "Pacientes", icon: Users, capability: "patients:read" },
  { href: "/financial", label: "Financeiro", icon: Wallet, capability: "financial:read" },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  href: "/settings",
  label: "Configurações",
  icon: Settings,
  capability: "dashboard:read",
};
