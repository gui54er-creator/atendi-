import { z } from "zod";

export const appointmentUpdateSchema = z.object({
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  type: z.string().trim().min(1).optional(),
  value: z.number().nonnegative().nullable().optional(),
  notes: z.string().optional(),
  status: z
    .enum(["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED", "NO_SHOW"])
    .optional(),
});

export const appointmentCreateSchema = z.object({
  patientId: z.string().min(1, "Selecione um paciente."),
  workplaceId: z.string().min(1, "Selecione um local de trabalho."),
  professionalId: z.string().min(1, "Selecione um profissional."),
  startsAt: z.string().min(1, "Informe a data e horário."),
  durationMinutes: z.number().int().positive(),
  type: z.string().trim().min(1, "Informe o tipo de atendimento."),
  value: z.number().nonnegative().nullable().optional(),
  notes: z.string().optional(),
  recurrence: z
    .object({
      frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
      interval: z.number().int().positive().default(1),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
      endDate: z.string().nullable().optional(),
      indefinite: z.boolean().default(false),
    })
    .nullable()
    .optional(),
  overrideConflict: z.boolean().optional(),
});

export const paymentSchema = z.object({
  amount: z.number().nonnegative(),
  status: z.enum(["PAID", "PENDING", "CANCELED"]),
  paymentMethod: z.enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]).optional(),
});

export const appointmentNoteSchema = z.object({
  content: z.string().trim().min(1, "Escreva uma anotação."),
});
