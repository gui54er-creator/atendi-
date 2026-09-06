import { z } from "zod";
import { calculateAge } from "@/lib/utils";

export const guardianSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(3, "Informe o nome completo do responsável."),
  relationship: z.string().trim().min(1, "Informe o parentesco."),
  cpf: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  email: z.union([z.string().trim().email("E-mail inválido."), z.literal("")]).optional(),
  cep: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  number: z.string().trim().optional().or(z.literal("")),
  complement: z.string().trim().optional().or(z.literal("")),
  neighborhood: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
});

export type GuardianInput = z.infer<typeof guardianSchema>;

const recordSchema = z.object({
  mainComplaint: z.string().trim().optional().or(z.literal("")),
  reasonForVisit: z.string().trim().optional().or(z.literal("")),
  history: z.string().trim().optional().or(z.literal("")),
  pastHistory: z.string().trim().optional().or(z.literal("")),
  medications: z.string().trim().optional().or(z.literal("")),
  allergies: z.string().trim().optional().or(z.literal("")),
  previousTreatments: z.string().trim().optional().or(z.literal("")),
  importantNotes: z.string().trim().optional().or(z.literal("")),
  goals: z.string().trim().optional().or(z.literal("")),
});

export const patientSchema = z
  .object({
    photoUrl: z.string().optional().or(z.literal("")),
    fullName: z.string().trim().min(3, "Informe o nome completo."),
    socialName: z.string().trim().optional().or(z.literal("")),
    cpf: z.string().trim().optional().or(z.literal("")),
    rg: z.string().trim().optional().or(z.literal("")),
    birthDate: z.string().trim().optional().or(z.literal("")),
    sex: z.enum(["MALE", "FEMALE", "INTERSEX", "NOT_INFORMED"]).default("NOT_INFORMED"),
    gender: z.string().trim().optional().or(z.literal("")),
    maritalStatus: z.string().trim().optional().or(z.literal("")),
    profession: z.string().trim().optional().or(z.literal("")),
    education: z.string().trim().optional().or(z.literal("")),
    nationality: z.string().trim().optional().or(z.literal("")),

    phone: z.string().trim().optional().or(z.literal("")),
    whatsapp: z.string().trim().optional().or(z.literal("")),
    email: z.union([z.string().trim().email("E-mail inválido."), z.literal("")]).optional(),

    cep: z.string().trim().optional().or(z.literal("")),
    address: z.string().trim().optional().or(z.literal("")),
    number: z.string().trim().optional().or(z.literal("")),
    complement: z.string().trim().optional().or(z.literal("")),
    neighborhood: z.string().trim().optional().or(z.literal("")),
    city: z.string().trim().optional().or(z.literal("")),
    state: z.string().trim().optional().or(z.literal("")),

    howFoundUs: z.string().trim().optional().or(z.literal("")),
    generalNotes: z.string().trim().optional().or(z.literal("")),
    firstVisitDate: z.string().trim().optional().or(z.literal("")),
    status: z.enum(["ACTIVE", "INACTIVE", "IN_PROGRESS", "DISCHARGED"]).default("ACTIVE"),

    guardians: z.array(guardianSchema).default([]),
    record: recordSchema.optional(),
    customFieldValues: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.birthDate) {
      const age = calculateAge(new Date(`${data.birthDate}T00:00:00`));
      if (age < 18 && data.guardians.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pacientes menores de 18 anos exigem pelo menos um responsável legal.",
          path: ["guardians"],
        });
      }
    }
  });

export type PatientInput = z.infer<typeof patientSchema>;
