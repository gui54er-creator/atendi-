import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext, ACTIVE_WORKPLACE_COOKIE, ALL_WORKPLACES } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({ workplaceId: z.string().nullable() });

export async function POST(req: Request) {
  const { ctx, error } = await requireApiContext();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });

  if (parsed.data.workplaceId) {
    const workplace = await prisma.workplace.findFirst({
      where: { id: parsed.data.workplaceId, companyId: ctx.companyId, deletedAt: null },
    });
    if (!workplace) return NextResponse.json({ error: "Local não encontrado." }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_WORKPLACE_COOKIE, parsed.data.workplaceId ?? ALL_WORKPLACES, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
