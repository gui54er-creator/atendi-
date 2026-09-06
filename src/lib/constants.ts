export const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União estável",
  "Outro",
];

export const EDUCATION_OPTIONS = [
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
  "Pós-graduação",
];

export const HOW_FOUND_US_OPTIONS = [
  "Indicação",
  "Instagram",
  "Facebook",
  "Google",
  "WhatsApp",
  "Site",
  "Passando em frente",
  "Outro",
];

export const GUARDIAN_RELATIONSHIP_OPTIONS = [
  "Mãe",
  "Pai",
  "Avó",
  "Avô",
  "Tio(a)",
  "Irmão(ã)",
  "Responsável legal",
  "Outro",
];

export const PATIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  IN_PROGRESS: "Em acompanhamento",
  DISCHARGED: "Alta",
};

export const PATIENT_STATUS_BADGE: Record<string, "success" | "secondary" | "warning" | "outline"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  IN_PROGRESS: "warning",
  DISCHARGED: "outline",
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
  NO_SHOW: "Faltou",
};

// Cores usadas na agenda para diferenciar status visualmente (item 13 do escopo).
export const APPOINTMENT_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  SCHEDULED: { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3" },
  CONFIRMED: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  IN_PROGRESS: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  COMPLETED: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  CANCELED: { bg: "#f3f4f6", border: "#9ca3af", text: "#4b5563" },
  NO_SHOW: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro",
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  CANCELED: "Cancelado",
};

export const CUSTOM_FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Texto",
  TEXTAREA: "Texto longo",
  NUMBER: "Número",
  DATE: "Data",
  BOOLEAN: "Sim/Não",
  SELECT: "Lista de opções",
};

export const RECURRENCE_FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Toda semana",
  BIWEEKLY: "A cada 2 semanas",
  MONTHLY: "Todo mês",
  CUSTOM: "Personalizado",
};

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_LABELS_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const APPOINTMENT_TYPE_OPTIONS = [
  "Consulta",
  "Retorno",
  "Avaliação",
  "Sessão",
  "Procedimento",
  "Outro",
];
