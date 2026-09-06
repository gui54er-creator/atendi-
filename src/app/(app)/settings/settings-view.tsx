"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PermissionContext } from "@/lib/permissions";
import { ProfileTab } from "./tabs/profile-tab";
import { CompanyTab } from "./tabs/company-tab";
import { WorkplacesTab } from "./tabs/workplaces-tab";
import { AgendaTab } from "./tabs/agenda-tab";
import { FinancialSettingsTab } from "./tabs/financial-tab";
import { UsersTab } from "./tabs/users-tab";
import { AuditTab } from "./tabs/audit-tab";

export function SettingsView({
  user,
  company,
  permissionContext,
  canManageCompany,
  canManageUsers,
  canReadAudit,
}: {
  user: any;
  company: any;
  permissionContext: PermissionContext;
  canManageCompany: boolean;
  canManageUsers: boolean;
  canReadAudit: boolean;
}) {
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Perfil</TabsTrigger>
        {canManageCompany && <TabsTrigger value="company">Empresa</TabsTrigger>}
        {canManageCompany && <TabsTrigger value="workplaces">Locais de trabalho</TabsTrigger>}
        {canManageCompany && <TabsTrigger value="agenda">Agenda</TabsTrigger>}
        {canManageCompany && <TabsTrigger value="financial">Financeiro</TabsTrigger>}
        {canManageUsers && <TabsTrigger value="users">Usuários</TabsTrigger>}
        {canReadAudit && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab user={user} />
      </TabsContent>

      {canManageCompany && (
        <TabsContent value="company">
          <CompanyTab company={company} />
        </TabsContent>
      )}

      {canManageCompany && (
        <TabsContent value="workplaces">
          <WorkplacesTab />
        </TabsContent>
      )}

      {canManageCompany && (
        <TabsContent value="agenda">
          <AgendaTab company={company} />
        </TabsContent>
      )}

      {canManageCompany && (
        <TabsContent value="financial">
          <FinancialSettingsTab company={company} />
        </TabsContent>
      )}

      {canManageUsers && (
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      )}

      {canReadAudit && (
        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
