import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireApiContext();
  if (error) return error;

  const notification = await prisma.notification.findFirst({
    where: { id: params.id, companyId: ctx.companyId, userId: ctx.user.id },
  });
  if (!notification) {
    return NextResponse.json({ error: "Notificação não encontrada." }, { status: 404 });
  }

  await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });

  return NextResponse.json({ ok: true });
}
