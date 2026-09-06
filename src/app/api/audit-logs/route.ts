import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { ctx, error } = await requireApiContext("audit:read");
  if (error) return error;

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);

  const logs = await prisma.auditLog.findMany({
    where: { companyId: ctx.companyId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });

  return NextResponse.json({ logs });
}
