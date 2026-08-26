import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { buildDataTools } from "./aiTools";

// Testa as ferramentas que a IA usa para consultar dados da clínica.
// Precisa de um PostgreSQL rodando e migrado (ver README).
//
// O que importa aqui: as contas de idade/período têm que bater exatamente
// (a IA confia nesses números e não tem como conferir), e uma clínica nunca
// pode enxergar dado de outra — nem se a pergunta pedir por isso.

function anosAtras(anos: number, diasExtra = 0) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anos);
  d.setDate(d.getDate() - diasExtra);
  return d;
}

function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

const sufixo = `${Date.now()}`;
let clinicaAId: string;
let clinicaBId: string;
let toolsA: ReturnType<typeof buildDataTools>;
let toolsB: ReturnType<typeof buildDataTools>;

const de = diasAtras(60).toISOString().slice(0, 10);
const ate = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  // ---------- Clínica A ----------
  const clinicaA = await prisma.clinic.create({
    data: { name: "Clinica Teste A", slug: `clinica-teste-a-${sufixo}` },
  });
  clinicaAId = clinicaA.id;
  const medicoA = await prisma.user.create({
    data: {
      clinicId: clinicaA.id, name: "Dra Ana Lima",
      email: `ana-${sufixo}@teste.local`, passwordHash: "x", role: "DOCTOR",
    },
  });

  // Idades 70, 60, 56, 54, 30 + um de exatamente 55 (aniversário ontem)
  // + um sem data de nascimento.
  const porIdade: Record<number, string> = {};
  for (const idade of [70, 60, 56, 54, 30]) {
    const p = await prisma.patient.create({
      data: { clinicId: clinicaA.id, name: `Paciente ${idade}`, birthDate: anosAtras(idade, 5) },
    });
    porIdade[idade] = p.id;
  }
  const paciente55 = await prisma.patient.create({
    data: { clinicId: clinicaA.id, name: "Paciente 55", birthDate: anosAtras(55, 1) },
  });
  await prisma.patient.create({ data: { clinicId: clinicaA.id, name: "Sem Nascimento" } });

  // Consultas: 3 concluídas dentro dos últimos 60 dias (70, 60, 55),
  // 1 concluída fora da janela (56, há 200 dias), 1 cancelada dentro (54).
  const consultas: [string, number, "COMPLETED" | "CANCELLED"][] = [
    [porIdade[70], 10, "COMPLETED"],
    [porIdade[60], 20, "COMPLETED"],
    [paciente55.id, 25, "COMPLETED"],
    [porIdade[56], 200, "COMPLETED"],
    [porIdade[54], 15, "CANCELLED"],
  ];
  for (const [patientId, dias, status] of consultas) {
    const inicio = diasAtras(dias);
    await prisma.appointment.create({
      data: {
        clinicId: clinicaA.id, patientId, doctorId: medicoA.id,
        startsAt: inicio, endsAt: new Date(inicio.getTime() + 30 * 60000), status,
      },
    });
  }

  await prisma.financeTransaction.createMany({
    data: [
      { clinicId: clinicaA.id, type: "INCOME", status: "COMPLETED", description: "Consulta", amount: 300, date: diasAtras(5), patientId: porIdade[70] },
      { clinicId: clinicaA.id, type: "INCOME", status: "COMPLETED", description: "Consulta", amount: 200, date: diasAtras(6), patientId: porIdade[60] },
      { clinicId: clinicaA.id, type: "INCOME", status: "PENDING", description: "Consulta", amount: 500, date: diasAtras(7), patientId: paciente55.id },
      { clinicId: clinicaA.id, type: "EXPENSE", status: "COMPLETED", description: "Aluguel", amount: 400, date: diasAtras(8) },
    ],
  });

  // ---------- Clínica B: existe só para provar que a A não a enxerga ----------
  const clinicaB = await prisma.clinic.create({
    data: { name: "Clinica Teste B", slug: `clinica-teste-b-${sufixo}` },
  });
  clinicaBId = clinicaB.id;
  const medicoB = await prisma.user.create({
    data: {
      clinicId: clinicaB.id, name: "Dr Bruno Costa",
      email: `bruno-${sufixo}@teste.local`, passwordHash: "x", role: "DOCTOR",
    },
  });
  for (let i = 0; i < 4; i++) {
    const p = await prisma.patient.create({
      data: { clinicId: clinicaB.id, name: `Paciente B${i}`, birthDate: anosAtras(80) },
    });
    const inicio = diasAtras(5);
    await prisma.appointment.create({
      data: {
        clinicId: clinicaB.id, patientId: p.id, doctorId: medicoB.id,
        startsAt: inicio, endsAt: new Date(inicio.getTime() + 30 * 60000), status: "COMPLETED",
      },
    });
  }
  await prisma.financeTransaction.create({
    data: { clinicId: clinicaB.id, type: "INCOME", status: "COMPLETED", description: "Consulta", amount: 9999, date: diasAtras(5) },
  });

  toolsA = buildDataTools(clinicaA.id);
  toolsB = buildDataTools(clinicaB.id);
});

afterAll(async () => {
  for (const clinicId of [clinicaAId, clinicaBId].filter(Boolean)) {
    await prisma.financeTransaction.deleteMany({ where: { clinicId } });
    await prisma.appointment.deleteMany({ where: { clinicId } });
    await prisma.patient.deleteMany({ where: { clinicId } });
    await prisma.user.deleteMany({ where: { clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
  }
  await prisma.$disconnect();
});

describe("contar_pacientes", () => {
  it("conta por idade mínima, incluindo quem fez 55 anos ontem", async () => {
    const r = (await toolsA("contar_pacientes", { idadeMinima: 55 })) as any;
    expect(r.quantidade).toBe(4); // 70, 60, 56, 55
  });

  it("conta por faixa de idade", async () => {
    const r = (await toolsA("contar_pacientes", { idadeMinima: 55, idadeMaxima: 60 })) as any;
    expect(r.quantidade).toBe(3); // 60, 56, 55
  });

  it("ignora paciente sem data de nascimento em filtro de idade", async () => {
    const semFiltro = (await toolsA("contar_pacientes", {})) as any;
    const comFiltro = (await toolsA("contar_pacientes", { idadeMinima: 0 })) as any;
    expect(semFiltro.quantidade).toBe(7);
    expect(comFiltro.quantidade).toBe(6);
  });

  it("responde a pergunta real: 55+ atendidos nos últimos 2 meses", async () => {
    const r = (await toolsA("contar_pacientes", {
      idadeMinima: 55, atendidoDe: de, atendidoAte: ate,
    })) as any;
    // O de 56 anos foi atendido há 200 dias, fora da janela.
    expect(r.quantidade).toBe(3);
  });

  it("não conta consulta cancelada como atendimento", async () => {
    const soRealizadas = (await toolsA("contar_pacientes", { atendidoDe: de, atendidoAte: ate })) as any;
    const incluindoCancelada = (await toolsA("contar_pacientes", {
      atendidoDe: de, atendidoAte: ate, apenasConsultasRealizadas: false,
    })) as any;
    expect(soRealizadas.quantidade).toBe(3);
    expect(incluindoCancelada.quantidade).toBe(4);
  });
});

describe("contar_consultas", () => {
  it("agrupa por status no período", async () => {
    const r = (await toolsA("contar_consultas", { de, ate })) as any;
    expect(r.total).toBe(4);
    expect(r.porStatus.COMPLETED).toBe(3);
    expect(r.porStatus.CANCELLED).toBe(1);
  });

  it("filtra por médico da própria clínica", async () => {
    const r = (await toolsA("contar_consultas", { de, ate, nomeMedico: "Ana" })) as any;
    expect(r.total).toBe(4);
  });

  it("rejeita data inválida em vez de devolver número errado", async () => {
    const r = (await toolsA("contar_consultas", { de: "abacaxi", ate: "" })) as any;
    expect(r.erro).toBeDefined();
  });
});

describe("resumo_financeiro", () => {
  it("soma receitas, despesas e ticket médio", async () => {
    const r = (await toolsA("resumo_financeiro", { de, ate })) as any;
    expect(r.totalReceitas).toBe(1000);
    expect(r.totalDespesas).toBe(400);
    expect(r.saldo).toBe(600);
    expect(r.recebido).toBe(500);
    expect(r.aReceber).toBe(500);
    expect(r.pacientesAtendidos).toBe(2);
    expect(r.ticketMedio).toBe(250);
  });
});

describe("isolamento entre clínicas", () => {
  it("não encontra médico de outra clínica, mesmo pelo nome exato", async () => {
    const r = (await toolsA("contar_consultas", { de, ate, nomeMedico: "Bruno Costa" })) as any;
    expect(r.erro).toBeDefined();
    expect(r.total).toBeUndefined();
  });

  it("cada clínica conta apenas os seus pacientes", async () => {
    const a = (await toolsA("contar_pacientes", { idadeMinima: 55 })) as any;
    const b = (await toolsB("contar_pacientes", { idadeMinima: 55 })) as any;
    expect(a.quantidade).toBe(4);
    expect(b.quantidade).toBe(4); // os 4 de 80 anos da B, não os da A
  });

  it("cada clínica conta apenas as suas consultas", async () => {
    const b = (await toolsB("contar_consultas", { de, ate })) as any;
    expect(b.total).toBe(4);
    expect(b.porStatus.CANCELLED).toBeUndefined(); // a cancelada é da clínica A
  });

  it("cada clínica vê apenas o seu financeiro", async () => {
    const a = (await toolsA("resumo_financeiro", { de, ate })) as any;
    const b = (await toolsB("resumo_financeiro", { de, ate })) as any;
    expect(a.totalReceitas).toBe(1000);
    expect(b.totalReceitas).toBe(9999);
  });
});

describe("ferramenta desconhecida", () => {
  it("devolve erro em vez de estourar exceção", async () => {
    const r = (await toolsA("ferramenta_inexistente", {})) as any;
    expect(r.erro).toBeDefined();
  });
});
