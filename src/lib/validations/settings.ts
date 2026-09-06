import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  phone: z.string().trim().optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z
      .string()
      .min(8, "A nova senha deve ter pelo menos 8 caracteres.")
      .regex(/[A-Z]/, "Deve ter ao menos uma letra maiúscula.")
      .regex(/[a-z]/, "Deve ter ao menos uma letra minúscula.")
      .regex(/[0-9]/, "Deve ter ao menos um número."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const agendaSettingsSchema = z.object({
  agendaStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  agendaEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  defaultDurationMinutes: z.number().int().positive(),
  workingDays: z.array(z.number().int().min(0).max(6)),
});

export const financialSettingsSchema = z.object({
  receptionistFinancialAccess: z.boolean(),
});

export const inviteMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  email: z.string().trim().email("E-mail inválido."),
  role: z.enum(["ADMIN", "PROFESSIONAL", "RECEPTIONIST"]),
});
