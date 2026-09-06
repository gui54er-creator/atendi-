import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().min(1, "Informe uma descrição."),
  amount: z.number().positive("Informe um valor maior que zero."),
  date: z.string().min(1, "Informe a data."),
  categoryId: z.string().optional().nullable(),
  patientId: z.string().optional().nullable(),
  appointmentId: z.string().optional().nullable(),
  paymentMethod: z
    .enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"])
    .optional()
    .nullable(),
  status: z.enum(["PAID", "PENDING", "CANCELED"]).default("PENDING"),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional().or(z.literal("")),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
