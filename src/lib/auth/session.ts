import "server-only";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { CompanyRole } from "@prisma/client";
import { authOptions } from "./options";
import { prisma } from "@/lib/prisma";
import { can, type Capability, type PermissionContext } from "@/lib/permissions";

export const ACTIVE_COMPANY_COOKIE = "atendi_active_company";
export const ACTIVE_WORKPLACE_COOKIE = "atendi_active_workplace";
export const ALL_WORKPLACES = "all";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export interface CompanyContext extends PermissionContext {
  user: SessionUser;
  companyId: string;
  companyName: string;
  memberships: { companyId: string; companyName: string; role: CompanyRole }[];
}

/**
 * Resolve o usuário autenticado + a empresa "ativa" (multi-tenant).
 * A empresa ativa vem de um cookie próprio (independente do JWT do NextAuth)
 * para permitir troca de empresa sem re-login, já que um usuário pode um dia
 * pertencer a mais de uma empresa (CompanyMember).
 *
 * TODA rota/página que lida com dado de empresa (paciente, agenda, financeiro...)
 * deve obter o companyId por aqui — nunca aceitar companyId vindo do client.
 */
export async function getCompanyContext(): Promise<CompanyContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const cookieStore = cookies();
  const preferredCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id, status: "ACTIVE", company: { deletedAt: null } },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) return null;

  const active = memberships.find((m) => m.companyId === preferredCompanyId) ?? memberships[0]!;

  return {
    user,
    companyId: active.companyId,
    companyName: active.company.name,
    role: active.role,
    receptionistFinancialAccess: active.company.receptionistFinancialAccess,
    memberships: memberships.map((m) => ({
      companyId: m.companyId,
      companyName: m.company.name,
      role: m.role,
    })),
  };
}

/**
 * Helper para route handlers (app/api/**): resolve contexto e já valida a
 * capability exigida. Uso:
 *   const { ctx, error } = await requireApiContext("patients:write");
 *   if (error) return error;
 */
export async function requireApiContext(
  capability?: Capability
): Promise<{ ctx: CompanyContext; error: null } | { ctx: null; error: NextResponse }> {
  const ctx = await getCompanyContext();

  if (!ctx) {
    const user = await getSessionUser();
    const status = user ? 409 : 401;
    const message = user
      ? "Nenhuma empresa ativa. Finalize o cadastro da empresa."
      : "Não autenticado.";
    return { ctx: null, error: NextResponse.json({ error: message }, { status }) };
  }

  if (capability && !can(ctx, capability)) {
    return {
      ctx: null,
      error: NextResponse.json({ error: "Você não tem permissão para esta ação." }, { status: 403 }),
    };
  }

  return { ctx, error: null };
}

export interface WorkplaceSummary {
  id: string;
  name: string;
  type: string | null;
  color: string;
  isDefault: boolean;
}

export interface WorkplaceContext extends CompanyContext {
  /** null = "Todos os locais" (visão consolidada da empresa). */
  workplaceId: string | null;
  workplaceName: string;
  workplaceColor: string | null;
  workplaces: WorkplaceSummary[];
}

/**
 * Resolve o contexto de empresa + o "Local de Trabalho" ativo. O local
 * selecionado funciona como filtro padrão para pacientes, agenda e
 * financeiro em toda a aplicação — é o mesmo padrão de cookie usado para a
 * empresa ativa (ACTIVE_COMPANY_COOKIE), só que um nível abaixo.
 */
export async function getWorkplaceContext(): Promise<WorkplaceContext | null> {
  const companyCtx = await getCompanyContext();
  if (!companyCtx) return null;

  const workplaces = await prisma.workplace.findMany({
    where: { companyId: companyCtx.companyId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, type: true, color: true, isDefault: true },
  });

  const cookieStore = cookies();
  const preferred = cookieStore.get(ACTIVE_WORKPLACE_COOKIE)?.value;

  if (preferred === ALL_WORKPLACES) {
    return {
      ...companyCtx,
      workplaceId: null,
      workplaceName: "Todos os locais",
      workplaceColor: null,
      workplaces,
    };
  }

  const active = workplaces.find((w) => w.id === preferred) ?? workplaces.find((w) => w.isDefault) ?? workplaces[0];

  if (!active) {
    return { ...companyCtx, workplaceId: null, workplaceName: "Todos os locais", workplaceColor: null, workplaces };
  }

  return {
    ...companyCtx,
    workplaceId: active.id,
    workplaceName: active.name,
    workplaceColor: active.color,
    workplaces,
  };
}

/**
 * Mesmo padrão de requireApiContext, mas já resolve o Local de Trabalho
 * ativo. Use em qualquer rota cujo dado pertença a um local (pacientes,
 * agenda, financeiro, arquivos).
 */
export async function requireWorkplaceApiContext(
  capability?: Capability
): Promise<{ ctx: WorkplaceContext; error: null } | { ctx: null; error: NextResponse }> {
  const { ctx, error } = await requireApiContext(capability);
  if (error) return { ctx: null, error };

  const workplaceCtx = await getWorkplaceContext();
  if (!workplaceCtx) {
    return {
      ctx: null,
      error: NextResponse.json({ error: "Nenhum local de trabalho cadastrado." }, { status: 409 }),
    };
  }

  return { ctx: workplaceCtx, error: null };
}
