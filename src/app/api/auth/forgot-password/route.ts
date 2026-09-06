import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 422 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Resposta sempre genérica: evita que alguém descubra quais e-mails têm conta.
  const genericResponse = {
    message: "Se este e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.",
  };

  if (!user || user.deletedAt) {
    return NextResponse.json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${rawToken}`;

  // NOTA: envio real de e-mail ainda não está implementado — não há provedor
  // SMTP/transacional configurado neste projeto. Por ora o link é apenas
  // logado no servidor (e devolvido na resposta em ambiente de desenvolvimento,
  // para permitir testar o fluxo ponta a ponta). Para produção, integrar um
  // provedor como Resend/SES/Postmark aqui.
  console.log(`[Atendi+] Link de redefinição de senha para ${email}: ${resetUrl}`);

  return NextResponse.json({
    ...genericResponse,
    ...(process.env.NODE_ENV !== "production" ? { devResetUrl: resetUrl } : {}),
  });
}
