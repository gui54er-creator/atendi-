import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { ctx, error } = await requireApiContext();
  if (error) return error;

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 20);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { companyId: ctx.companyId, userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { companyId: ctx.companyId, userId: ctx.user.id, read: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH() {
  const { ctx, error } = await requireApiContext();
  if (error) return error;

  await prisma.notification.updateMany({
    where: { companyId: ctx.companyId, userId: ctx.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
