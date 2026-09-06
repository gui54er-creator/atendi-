import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "company.created"
  | "patient.created"
  | "patient.updated"
  | "patient.deleted"
  | "patient.record_updated"
  | "appointment.created"
  | "appointment.updated"
  | "appointment.deleted"
  | "appointment.note_added"
  | "file.added"
  | "file.deleted"
  | "transaction.created"
  | "transaction.updated"
  | "transaction.deleted"
  | "member.invited"
  | "member.role_changed"
  | "settings.updated";

export async function logAudit(params: {
  companyId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
