import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMonths, setHours, setMinutes, startOfDay, subDays, subMonths } from "date-fns";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo1234";
const OWNER_EMAIL = "demo@atendiplus.com.br";
const PROFESSIONAL_EMAIL = "profissional@atendiplus.com.br";
const RECEPTIONIST_EMAIL = "recepcao@atendiplus.com.br";

function at(date: Date, hour: number, minute = 0) {
  return setMinutes(setHours(startOfDay(date), hour), minute);
}

async function main() {
  console.log("Limpando dados de demonstração anteriores (se existirem)...");
  const existing = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (existing) {
    const memberships = await prisma.companyMember.findMany({ where: { userId: existing.id } });
    for (const m of memberships) {
      await prisma.company.delete({ where: { id: m.companyId } }).catch(() => undefined);
    }
    await prisma.user.deleteMany({
      where: { email: { in: [OWNER_EMAIL, PROFESSIONAL_EMAIL, RECEPTIONIST_EMAIL] } },
    });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("Criando usuários de demonstração...");
  const owner = await prisma.user.create({
    data: { name: "Dra. Camila Andrade", email: OWNER_EMAIL, phone: "(11) 98765-4321", passwordHash },
  });
  const professional = await prisma.user.create({
    data: { name: "Dr. Rafael Torres", email: PROFESSIONAL_EMAIL, phone: "(11) 98888-1122", passwordHash },
  });
  const receptionist = await prisma.user.create({
    data: { name: "Juliana Prado", email: RECEPTIONIST_EMAIL, phone: "(11) 97777-3344", passwordHash },
  });

  console.log("Criando empresa de demonstração...");
  const company = await prisma.company.create({
    data: {
      name: "Clínica Atendi+ Saúde Integrada LTDA",
      tradeName: "Atendi+ Saúde Integrada",
      taxId: "12345678000199",
      phone: "(11) 3345-6789",
      whatsapp: "(11) 98765-0000",
      email: "contato@atendiplussaude.com.br",
      cep: "01310-100",
      address: "Avenida Paulista",
      number: "1578",
      complement: "Conjunto 92",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      agendaStartTime: "08:00",
      agendaEndTime: "19:00",
      defaultDurationMinutes: 60,
      workingDays: [1, 2, 3, 4, 5],
      currency: "BRL",
    },
  });

  await prisma.companyMember.createMany({
    data: [
      { userId: owner.id, companyId: company.id, role: "OWNER", status: "ACTIVE" },
      { userId: professional.id, companyId: company.id, role: "PROFESSIONAL", status: "ACTIVE" },
      { userId: receptionist.id, companyId: company.id, role: "RECEPTIONIST", status: "ACTIVE" },
    ],
  });

  console.log("Criando locais de trabalho...");
  const clinicaCentral = await prisma.workplace.create({
    data: {
      companyId: company.id,
      name: "Clínica Central",
      type: "Clínica",
      color: "#6366F1",
      isDefault: true,
      cep: "01310-100",
      address: "Avenida Paulista",
      number: "1578",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      phone: "(11) 3345-6789",
    },
  });
  const consultorioParticular = await prisma.workplace.create({
    data: {
      companyId: company.id,
      name: "Consultório Particular",
      type: "Consultório",
      color: "#8B5CF6",
      cep: "04538-133",
      address: "Rua Iguatemi",
      number: "192",
      neighborhood: "Itaim Bibi",
      city: "São Paulo",
      state: "SP",
      phone: "(11) 98888-4321",
    },
  });
  const atendimentoOnline = await prisma.workplace.create({
    data: {
      companyId: company.id,
      name: "Atendimento Online",
      type: "Online",
      color: "#10B981",
      notes: "Consultas por videochamada.",
    },
  });

  console.log("Criando categorias financeiras...");
  const incomeCategory = await prisma.expenseCategory.create({
    data: { companyId: company.id, name: "Consulta", type: "INCOME", isDefault: true },
  });
  const expenseCategoryNames = [
    "Aluguel",
    "Energia",
    "Internet",
    "Funcionários",
    "Equipamentos",
    "Materiais",
    "Marketing",
    "Impostos",
    "Outros",
  ];
  const expenseCategories: Record<string, string> = {};
  for (const name of expenseCategoryNames) {
    const cat = await prisma.expenseCategory.create({
      data: { companyId: company.id, name, type: "EXPENSE", isDefault: true },
    });
    expenseCategories[name] = cat.id;
  }

  console.log("Criando campos personalizados...");
  const customFieldConvenio = await prisma.customField.create({
    data: {
      companyId: company.id,
      label: "Convênio",
      type: "SELECT",
      options: ["Particular", "Unimed", "Bradesco Saúde", "SulAmérica", "Amil"],
      required: false,
      order: 0,
    },
  });
  const customFieldDor = await prisma.customField.create({
    data: { companyId: company.id, label: "Nível de dor (0-10)", type: "NUMBER", required: false, order: 1 },
  });
  const customFieldFotos = await prisma.customField.create({
    data: {
      companyId: company.id,
      label: "Autoriza uso de fotos para portfólio",
      type: "BOOLEAN",
      required: false,
      order: 2,
    },
  });

  const now = new Date();

  console.log("Criando pacientes...");
  // A maioria pertence a um único local; Beatriz é atendida em dois locais
  // (Clínica Central e Consultório Particular) para demonstrar o
  // compartilhamento de identidade sem duplicar o cadastro.
  const patientsData = [
    {
      fullName: "Beatriz Almeida Santos",
      birthDate: new Date(1990, 3, 12),
      sex: "FEMALE" as const,
      phone: "(11) 99111-2233",
      email: "beatriz.santos@example.com",
      status: "ACTIVE" as const,
      profession: "Designer",
      photo: true,
      complaint: "Dor lombar recorrente há 3 meses.",
      workplaces: [clinicaCentral, consultorioParticular],
    },
    {
      fullName: "Carlos Eduardo Ferreira",
      birthDate: new Date(1985, 7, 22),
      sex: "MALE" as const,
      phone: "(11) 99222-3344",
      email: "carlos.ferreira@example.com",
      status: "ACTIVE" as const,
      profession: "Engenheiro",
      photo: true,
      complaint: "Acompanhamento de reabilitação do joelho direito.",
      workplaces: [clinicaCentral],
    },
    {
      fullName: "Débora Cristina Lima",
      birthDate: new Date(1978, 1, 5),
      sex: "FEMALE" as const,
      phone: "(11) 99333-4455",
      email: "debora.lima@example.com",
      status: "IN_PROGRESS" as const,
      profession: "Advogada",
      photo: false,
      complaint: "Ansiedade e dificuldade para dormir.",
      workplaces: [atendimentoOnline],
    },
    {
      fullName: "Eduardo Henrique Costa",
      birthDate: new Date(1995, 10, 30),
      sex: "MALE" as const,
      phone: "(11) 99444-5566",
      email: "eduardo.costa@example.com",
      status: "ACTIVE" as const,
      profession: "Professor",
      photo: true,
      complaint: "Avaliação postural inicial.",
      workplaces: [clinicaCentral],
    },
    {
      fullName: "Fernanda Oliveira Souza",
      birthDate: new Date(1982, 5, 18),
      sex: "FEMALE" as const,
      phone: "(11) 99555-6677",
      email: "fernanda.souza@example.com",
      status: "DISCHARGED" as const,
      profession: "Enfermeira",
      photo: false,
      complaint: "Tratamento concluído com alta em todas as queixas.",
      workplaces: [clinicaCentral],
    },
    {
      fullName: "Helena Vieira Cardoso",
      birthDate: new Date(1970, 8, 9),
      sex: "FEMALE" as const,
      phone: "(11) 99666-7788",
      email: "helena.cardoso@example.com",
      status: "ACTIVE" as const,
      profession: "Aposentada",
      photo: true,
      complaint: "Dores articulares crônicas.",
      workplaces: [consultorioParticular],
    },
    {
      fullName: "Igor Barbosa Nunes",
      birthDate: new Date(1992, 2, 27),
      sex: "MALE" as const,
      phone: "(11) 99777-8899",
      email: "igor.nunes@example.com",
      status: "INACTIVE" as const,
      profession: "Autônomo",
      photo: false,
      complaint: "Sem retorno há alguns meses.",
      workplaces: [clinicaCentral],
    },
    {
      fullName: "Juliana Ramos Pereira",
      birthDate: new Date(1988, 11, 14),
      sex: "FEMALE" as const,
      phone: "(11) 99888-9900",
      email: "juliana.pereira@example.com",
      status: "ACTIVE" as const,
      profession: "Jornalista",
      photo: true,
      complaint: "Acompanhamento nutricional quinzenal.",
      workplaces: [consultorioParticular],
    },
    {
      fullName: "Lucas Mendes Araújo",
      birthDate: new Date(1998, 4, 3),
      sex: "MALE" as const,
      phone: "(11) 99999-0011",
      email: "lucas.araujo@example.com",
      status: "ACTIVE" as const,
      profession: "Estudante",
      photo: false,
      complaint: "Primeira avaliação, sem queixas específicas.",
      workplaces: [clinicaCentral],
    },
    {
      fullName: "Gabriel Rocha Martins",
      birthDate: subDays(now, 15 * 365),
      sex: "MALE" as const,
      phone: "(11) 99000-1122",
      email: null,
      status: "ACTIVE" as const,
      profession: null,
      photo: false,
      complaint: "Acompanhamento de desenvolvimento — encaminhado pela escola.",
      workplaces: [clinicaCentral],
    },
  ];

  const patients: Record<string, { id: string }> = {};

  for (let i = 0; i < patientsData.length; i++) {
    const p = patientsData[i]!;
    const patient = await prisma.patient.create({
      data: {
        companyId: company.id,
        createdById: owner.id,
        photoUrl: p.photo ? `https://i.pravatar.cc/300?img=${i + 10}` : null,
        fullName: p.fullName,
        cpf: String(10000000000 + i * 1111111).padStart(11, "0"),
        rg: String(100000000 + i * 22222),
        birthDate: p.birthDate,
        sex: p.sex,
        maritalStatus: "Solteiro(a)",
        profession: p.profession,
        education: "Superior completo",
        nationality: "Brasileira",
        phone: p.phone,
        whatsapp: p.phone,
        email: p.email,
        cep: "04538-133",
        address: "Rua Iguatemi",
        number: String(100 + i * 10),
        neighborhood: "Itaim Bibi",
        city: "São Paulo",
        state: "SP",
        generalNotes: null,
      },
    });
    patients[p.fullName] = { id: patient.id };

    for (const wp of p.workplaces) {
      await prisma.patientWorkplace.create({
        data: {
          patientId: patient.id,
          workplaceId: wp.id,
          status: p.status,
          howFoundUs: ["Indicação", "Instagram", "Google", "WhatsApp"][i % 4],
          joinedAt: subMonths(now, 1 + (i % 6)),
          record: {
            create: {
              mainComplaint: p.complaint,
              reasonForVisit: "Acompanhamento contínuo",
              history: "Sem histórico relevante adicional.",
              allergies: i % 5 === 0 ? "Dipirona" : null,
              goals: "Melhora da qualidade de vida e redução dos sintomas.",
            },
          },
          customFieldValues: {
            create: [
              { customFieldId: customFieldConvenio.id, value: ["Particular", "Unimed", "Bradesco Saúde"][i % 3]! },
              { customFieldId: customFieldDor.id, value: String((i * 2) % 10) },
              { customFieldId: customFieldFotos.id, value: i % 2 === 0 ? "true" : "false" },
            ],
          },
        },
      });
    }
  }

  console.log("Cadastrando responsável do paciente menor de idade...");
  await prisma.guardian.create({
    data: {
      patientId: patients["Gabriel Rocha Martins"]!.id,
      fullName: "Sandra Martins",
      relationship: "Mãe",
      cpf: "98765432100",
      phone: "(11) 98123-4567",
      whatsapp: "(11) 98123-4567",
      email: "sandra.martins@example.com",
      cep: "04538-133",
      address: "Rua Iguatemi",
      number: "220",
      neighborhood: "Itaim Bibi",
      city: "São Paulo",
      state: "SP",
    },
  });

  console.log("Criando atendimentos, prontuário de evolução e financeiro...");
  const appointmentTypes = ["Consulta", "Retorno", "Sessão", "Avaliação"];
  const paymentMethods = ["PIX", "CREDIT_CARD", "CASH", "DEBIT_CARD"] as const;

  // Local primário de cada paciente (usado pelas gerações abaixo).
  function primaryWorkplaceId(fullName: string) {
    return patientsData.find((p) => p.fullName === fullName)!.workplaces[0]!.id;
  }

  // Atendimentos passados (últimos 3 meses) com evolução, pagamento e receita.
  const namesForPast = Object.keys(patients);
  for (let i = 0; i < 14; i++) {
    const patientName = namesForPast[i % namesForPast.length]!;
    const workplaceId = primaryWorkplaceId(patientName);
    const daysAgo = 3 + i * 6;
    const date = at(subDays(now, daysAgo), 9 + (i % 8));
    const value = 150 + (i % 4) * 50;
    const professionalId = i % 3 === 0 ? professional.id : owner.id;

    const appointment = await prisma.appointment.create({
      data: {
        companyId: company.id,
        workplaceId,
        patientId: patients[patientName]!.id,
        professionalId,
        startsAt: date,
        endsAt: new Date(date.getTime() + 60 * 60000),
        type: appointmentTypes[i % appointmentTypes.length]!,
        value,
        status: "COMPLETED",
        appointmentNotes: {
          create: {
            authorId: professionalId,
            content: "Paciente evoluindo bem. Manter conduta atual e reavaliar no próximo retorno.",
          },
        },
      },
    });

    const isPending = i % 6 === 0;
    await prisma.transaction.create({
      data: {
        companyId: company.id,
        workplaceId,
        type: "INCOME",
        description: `Atendimento — ${appointment.type}`,
        amount: value,
        date,
        status: isPending ? "PENDING" : "PAID",
        paymentMethod: isPending ? null : paymentMethods[i % paymentMethods.length],
        categoryId: incomeCategory.id,
        patientId: patients[patientName]!.id,
        appointmentId: appointment.id,
        createdById: owner.id,
      },
    });
  }

  // Receita e despesas históricas (para os gráficos dos últimos 6 meses),
  // distribuídas entre os 3 locais.
  const allWorkplaces = [clinicaCentral, consultorioParticular, atendimentoOnline];
  for (let m = 5; m >= 0; m--) {
    const monthDate = subMonths(now, m);
    for (let k = 0; k < 20; k++) {
      const patientName = namesForPast[(m + k) % namesForPast.length]!;
      const workplaceId = primaryWorkplaceId(patientName);
      const date = at(addDays(monthDate, Math.floor(k / 2)), 9 + (k % 8));
      const value = 180 + (k % 4) * 50;
      await prisma.transaction.create({
        data: {
          companyId: company.id,
          workplaceId,
          type: "INCOME",
          description: "Atendimento — Consulta",
          amount: value,
          date,
          status: "PAID",
          paymentMethod: paymentMethods[k % paymentMethods.length],
          categoryId: incomeCategory.id,
          patientId: patients[patientName]!.id,
          createdById: owner.id,
        },
      });
    }

    // Despesas fixas mensais — a Clínica Central concentra a maior parte,
    // cada local também tem seus próprios custos.
    for (const wp of allWorkplaces) {
      const factor = wp.id === clinicaCentral.id ? 1 : 0.35;
      await prisma.transaction.create({
        data: {
          companyId: company.id,
          workplaceId: wp.id,
          type: "EXPENSE",
          description: wp.id === atendimentoOnline.id ? "Assinatura de plataforma de videochamada" : "Aluguel",
          amount: Math.round(3500 * factor),
          date: at(monthDate, 5),
          status: "PAID",
          isRecurring: true,
          categoryId: expenseCategories[wp.id === atendimentoOnline.id ? "Equipamentos" : "Aluguel"]!,
          createdById: owner.id,
        },
      });
      await prisma.transaction.create({
        data: {
          companyId: company.id,
          workplaceId: wp.id,
          type: "EXPENSE",
          description: "Internet e telefonia",
          amount: Math.round(250 * factor),
          date: at(monthDate, 6),
          status: "PAID",
          isRecurring: true,
          categoryId: expenseCategories["Internet"]!,
          createdById: owner.id,
        },
      });
    }
    await prisma.transaction.create({
      data: {
        companyId: company.id,
        workplaceId: clinicaCentral.id,
        type: "EXPENSE",
        description: "Campanha de marketing local",
        amount: 300 + m * 20,
        date: at(monthDate, 12),
        status: "PAID",
        categoryId: expenseCategories["Marketing"]!,
        createdById: owner.id,
      },
    });
  }

  // Atendimentos de hoje e da semana (para o dashboard não ficar zerado),
  // espalhados entre locais diferentes.
  console.log("Criando atendimentos de hoje e da semana...");
  await prisma.appointment.create({
    data: {
      companyId: company.id,
      workplaceId: clinicaCentral.id,
      patientId: patients["Beatriz Almeida Santos"]!.id,
      professionalId: owner.id,
      startsAt: at(now, 15),
      endsAt: at(now, 16),
      type: "Retorno",
      value: 200,
      status: "CONFIRMED",
    },
  });
  await prisma.appointment.create({
    data: {
      companyId: company.id,
      workplaceId: consultorioParticular.id,
      patientId: patients["Helena Vieira Cardoso"]!.id,
      professionalId: owner.id,
      startsAt: at(now, 17),
      endsAt: at(now, 18),
      type: "Avaliação",
      value: 220,
      status: "SCHEDULED",
    },
  });
  await prisma.appointment.create({
    data: {
      companyId: company.id,
      workplaceId: atendimentoOnline.id,
      patientId: patients["Débora Cristina Lima"]!.id,
      professionalId: professional.id,
      startsAt: at(now, 11),
      endsAt: at(now, 12),
      type: "Sessão",
      value: 190,
      status: "CONFIRMED",
    },
  });

  for (let i = 1; i <= 4; i++) {
    const patientName = namesForPast[i]!;
    const workplaceId = primaryWorkplaceId(patientName);
    await prisma.appointment.create({
      data: {
        companyId: company.id,
        workplaceId,
        patientId: patients[patientName]!.id,
        professionalId: i % 2 === 0 ? professional.id : owner.id,
        startsAt: at(addDays(now, i), 9 + i),
        endsAt: at(addDays(now, i), 10 + i),
        type: appointmentTypes[i % appointmentTypes.length]!,
        value: 180,
        status: "SCHEDULED",
      },
    });
  }

  console.log("Criando pacientes recorrentes...");
  // Carlos: toda quinta-feira às 10h, por 4 meses, na Clínica Central.
  const carlosStart = at(addDays(now, ((4 - now.getDay() + 7) % 7) + 7), 10);
  const carlosSeries = await prisma.appointmentSeries.create({
    data: {
      companyId: company.id,
      workplaceId: clinicaCentral.id,
      patientId: patients["Carlos Eduardo Ferreira"]!.id,
      professionalId: owner.id,
      frequency: "WEEKLY",
      interval: 1,
      daysOfWeek: [4],
      startTime: "10:00",
      durationMinutes: 60,
      type: "Sessão",
      value: 180,
      startDate: carlosStart,
      endDate: addMonths(carlosStart, 4),
      indefinite: false,
    },
  });
  for (let d = new Date(carlosStart); d <= addMonths(carlosStart, 4); d = addDays(d, 7)) {
    await prisma.appointment.create({
      data: {
        companyId: company.id,
        workplaceId: clinicaCentral.id,
        patientId: patients["Carlos Eduardo Ferreira"]!.id,
        professionalId: owner.id,
        seriesId: carlosSeries.id,
        startsAt: new Date(d),
        endsAt: new Date(d.getTime() + 60 * 60000),
        type: "Sessão",
        value: 180,
        status: "SCHEDULED",
      },
    });
  }

  // Juliana: a cada 2 semanas às 11h, indefinidamente, no Consultório Particular.
  const julianaStart = at(addDays(now, ((2 - now.getDay() + 7) % 7) + 3), 11);
  const julianaSeries = await prisma.appointmentSeries.create({
    data: {
      companyId: company.id,
      workplaceId: consultorioParticular.id,
      patientId: patients["Juliana Ramos Pereira"]!.id,
      professionalId: professional.id,
      frequency: "BIWEEKLY",
      interval: 2,
      daysOfWeek: [2],
      startTime: "11:00",
      durationMinutes: 45,
      type: "Consulta",
      value: 160,
      startDate: julianaStart,
      endDate: null,
      indefinite: true,
    },
  });
  for (let d = new Date(julianaStart); d <= addMonths(julianaStart, 6); d = addDays(d, 14)) {
    await prisma.appointment.create({
      data: {
        companyId: company.id,
        workplaceId: consultorioParticular.id,
        patientId: patients["Juliana Ramos Pereira"]!.id,
        professionalId: professional.id,
        seriesId: julianaSeries.id,
        startsAt: new Date(d),
        endsAt: new Date(d.getTime() + 45 * 60000),
        type: "Consulta",
        value: 160,
        status: "SCHEDULED",
      },
    });
  }

  console.log("\nDados de demonstração criados com sucesso!\n");
  console.log("Login de demonstração:");
  console.log(`  Proprietário:    ${OWNER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Profissional:    ${PROFESSIONAL_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Recepcionista:   ${RECEPTIONIST_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
