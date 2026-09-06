import { NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { requireApiContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema } from "@/lib/validations/settings";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const { ctx, error } = await requireApiContext("users:manage");
  if (error) return error;

  const members = await prisma.companyMember.findMany({
    where: { companyId: ctx.companyId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const { ctx, error } = await requireApiContext("users:manage");
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const existingMembership = await prisma.companyMember.findUnique({
      where: { userId_companyId: { userId: user.id, companyId: ctx.companyId } },
    });
    if (existingMembership) {
      return NextResponse.json({ error: "Este usuário já faz parte da empresa." }, { status: 409 });
    }
  } else {
    // Cria a conta com uma senha aleatória e inutilizável — o convidado
    // define a própria senha através do mesmo fluxo de "esqueci minha senha".
    const randomPassword = crypto.randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    user = await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash },
    });
  }

  await prisma.companyMember.create({
    data: { userId: user.id, companyId: ctx.companyId, role: parsed.data.role, status: "INVITED" },
  });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${rawToken}`;

  // NOTA: envio de e-mail de convite ainda não implementado — ver
  // /api/auth/forgot-password para o mesmo padrão. Em produção, enviar
  // `inviteUrl` por e-mail em vez de devolvê-lo na resposta.
  console.log(`[Atendi+] Convite para ${email}: ${inviteUrl}`);

  await logAudit({
    companyId: ctx.companyId,
    userId: ctx.user.id,
    action: "member.invited",
    entityType: "CompanyMember",
    entityId: user.id,
  });

  return NextResponse.json(
    {
      member: { userId: user.id, email },
      ...(process.env.NODE_ENV !== "production" ? { devInviteUrl: inviteUrl } : {}),
    },
    { status: 201 }
  );
}
