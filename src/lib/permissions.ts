import type { CompanyRole } from "@prisma/client";

/**
 * Arquitetura central de permissões. Toda checagem de "o usuário pode fazer X"
 * no sistema deve passar por `can()` — nunca comparar `role === "OWNER"`
 * diretamente em páginas/rotas.
 */
export const CAPABILITIES = [
  "dashboard:read",
  "patients:read",
  "patients:write",
  "patients:delete",
  "clinical:read",
  "clinical:write",
  "agenda:read",
  "agenda:write",
  "financial:read",
  "financial:write",
  "users:manage",
  "company:manage",
  "audit:read",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

type CapabilityMatrix = Record<CompanyRole, Record<Capability, boolean>>;

function all(value: boolean): Record<Capability, boolean> {
  return CAPABILITIES.reduce((acc, cap) => {
    acc[cap] = value;
    return acc;
  }, {} as Record<Capability, boolean>);
}

const BASE_MATRIX: CapabilityMatrix = {
  OWNER: all(true),
  ADMIN: all(true),
  PROFESSIONAL: {
    "dashboard:read": true,
    "patients:read": true,
    "patients:write": true,
    "patients:delete": false,
    "clinical:read": true,
    "clinical:write": true,
    "agenda:read": true,
    "agenda:write": true,
    "financial:read": false,
    "financial:write": false,
    "users:manage": false,
    "company:manage": false,
    "audit:read": false,
  },
  RECEPTIONIST: {
    "dashboard:read": true,
    "patients:read": true,
    "patients:write": true,
    "patients:delete": false,
    "clinical:read": false,
    "clinical:write": false,
    "agenda:read": true,
    "agenda:write": true,
    "financial:read": false,
    "financial:write": false,
    "users:manage": false,
    "company:manage": false,
    "audit:read": false,
  },
};

export interface PermissionContext {
  role: CompanyRole;
  /** Empresas podem liberar financeiro para recepcionistas (item 18 do escopo). */
  receptionistFinancialAccess?: boolean;
}

export function can(ctx: PermissionContext, capability: Capability): boolean {
  const base = BASE_MATRIX[ctx.role][capability];
  if (base) return true;

  if (
    ctx.role === "RECEPTIONIST" &&
    ctx.receptionistFinancialAccess &&
    (capability === "financial:read" || capability === "financial:write")
  ) {
    return true;
  }

  return false;
}

export function assertCan(ctx: PermissionContext, capability: Capability): void {
  if (!can(ctx, capability)) {
    throw new PermissionError(capability);
  }
}

export class PermissionError extends Error {
  constructor(public capability: Capability) {
    super(`Acesso negado: permissão "${capability}" é necessária.`);
    this.name = "PermissionError";
  }
}

export const ROLE_LABELS: Record<CompanyRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  PROFESSIONAL: "Profissional",
  RECEPTIONIST: "Recepcionista",
};

/**
 * Escopo por profissional (patients/agenda "próprios") ainda não é aplicado
 * a nível de dado — hoje PROFESSIONAL enxerga todos os pacientes da empresa.
 * Extensão futura: adicionar Patient.primaryProfessionalId e filtrar as
 * queries de listagem quando o papel for PROFESSIONAL.
 */
