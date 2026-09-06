import { z } from "zod";

export const workplaceSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome para o local."),
  type: z.string().trim().optional().or(z.literal("")),
  color: z.string().trim().min(4).default("#6366F1"),
  cep: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  number: z.string().trim().optional().or(z.literal("")),
  complement: z.string().trim().optional().or(z.literal("")),
  neighborhood: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  importFromWorkplaceId: z.string().optional(),
  importPatientIds: z.array(z.string()).optional(),
});

export type WorkplaceInput = z.infer<typeof workplaceSchema>;

export const importPatientsSchema = z.object({
  sourceWorkplaceId: z.string().min(1),
  patientIds: z.array(z.string()).min(1, "Selecione ao menos um paciente."),
});

export const WORKPLACE_COLOR_PRESETS = [
  "#6366F1", // índigo
  "#8B5CF6", // roxo
  "#10B981", // verde
  "#F59E0B", // âmbar
  "#EF4444", // vermelho
  "#06B6D4", // ciano
  "#EC4899", // rosa
  "#64748B", // grafite
];
