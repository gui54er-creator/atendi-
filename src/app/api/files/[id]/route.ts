import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { readPrivateFile, deletePrivateFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

async function findFileOrNull(companyId: string, id: string) {
  return prisma.patientFile.findFirst({ where: { id, companyId, deletedAt: null } });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("patients:read");
  if (error) return error;

  const file = await findFileOrNull(ctx.companyId, params.id);
  if (!file) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const buffer = await readPrivateFile(file.storageKey).catch(() => null);
  if (!buffer) {
    return NextResponse.json({ error: "Arquivo não encontrado no armazenamento." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext("patients:write");
  if (error) return error;

  const file = await findFileOrNull(ctx.companyId, params.id);
  if (!file) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  await prisma.patientFile.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
  await deletePrivateFile(file.storageKey);

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "file.deleted",
    entityType: "PatientFile",
    entityId: file.id,
  });

  return NextResponse.json({ ok: true });
}
