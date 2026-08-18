import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultTemplates = [
  {
    kind: "ATESTADO" as const,
    name: "Atestado médico (padrão)",
    content:
      "Atesto para os devidos fins que o(a) paciente {{paciente}} esteve sob meus cuidados médicos " +
      "em {{data}}, necessitando de {{dias}} dia(s) de afastamento de suas atividades a partir desta data.\n\n" +
      "CID: {{cid}}\n\n{{cidade}}, {{data}}.\n\n_____________________________\n{{medico}} — CRM {{crm}}",
  },
  {
    kind: "RECEITA" as const,
    name: "Receita médica (padrão)",
    content:
      "Paciente: {{paciente}}\nData: {{data}}\n\nUso {{uso}}\n\n{{medicamentos}}\n\n" +
      "{{cidade}}, {{data}}.\n\n_____________________________\n{{medico}} — CRM {{crm}}",
  },
  {
    kind: "DIAGNOSTICO" as const,
    name: "Relatório de diagnóstico (padrão)",
    content:
      "Paciente: {{paciente}}\nData: {{data}}\n\nHipótese diagnóstica / CID: {{cid}}\n\n" +
      "Descrição:\n{{descricao}}\n\n{{cidade}}, {{data}}.\n\n_____________________________\n{{medico}} — CRM {{crm}}",
  },
  {
    kind: "RECIBO" as const,
    name: "Recibo de pagamento (padrão)",
    content:
      "Recebi de {{paciente}} a quantia de R$ {{valor}} referente a {{descricao}}, prestado em {{data}}.\n\n" +
      "{{cidade}}, {{data}}.\n\n_____________________________\n{{medico}} — CRM {{crm}}",
  },
];

async function main() {
  for (const template of defaultTemplates) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { clinicId: null, kind: template.kind, name: template.name },
    });
    if (!existing) {
      await prisma.documentTemplate.create({ data: { ...template, clinicId: null } });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
