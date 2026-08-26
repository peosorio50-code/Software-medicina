import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { findInactivePatients, getAgendaStats } from "./clinicInsights";

// Testa as análises que alimentam a reativação de pacientes e os insights da
// agenda. São contas que a IA depois apresenta como fato, então precisam estar
// exatas — e, como sempre, uma clínica não pode enxergar dado de outra.

const UM_DIA = 24 * 60 * 60 * 1000;

function diasAtras(dias: number) {
  return new Date(Date.now() - dias * UM_DIA);
}

function daquiADias(dias: number) {
  return new Date(Date.now() + dias * UM_DIA);
}

const sufixo = `${Date.now()}`;
let clinicaAId: string;
let clinicaBId: string;
let medicoAId: string;
const idsPorNome: Record<string, string> = {};

async function criarPaciente(
  clinicId: string,
  doctorId: string,
  nome: string,
  consultas: { dias: number; status: "COMPLETED" | "SCHEDULED" | "NO_SHOW" | "CANCELLED"; futuro?: boolean }[],
) {
  const paciente = await prisma.patient.create({
    data: { clinicId, name: nome, phone: "11999990000" },
  });
  idsPorNome[nome] = paciente.id;
  for (const c of consultas) {
    const inicio = c.futuro ? daquiADias(c.dias) : diasAtras(c.dias);
    await prisma.appointment.create({
      data: {
        clinicId, patientId: paciente.id, doctorId,
        startsAt: inicio, endsAt: new Date(inicio.getTime() + 30 * 60000),
        status: c.status,
      },
    });
  }
  return paciente;
}

beforeAll(async () => {
  const clinicaA = await prisma.clinic.create({
    data: { name: "Insights A", slug: `insights-a-${sufixo}` },
  });
  clinicaAId = clinicaA.id;
  const medicoA = await prisma.user.create({
    data: {
      clinicId: clinicaA.id, name: "Dra Ana", email: `ins-ana-${sufixo}@teste.local`,
      passwordHash: "x", role: "DOCTOR",
    },
  });
  medicoAId = medicoA.id;

  // "Ritmo Quebrado": vinha a cada ~90 dias, sumiu há 360 → fator ~4
  await criarPaciente(clinicaA.id, medicoA.id, "Ritmo Quebrado", [
    { dias: 630, status: "COMPLETED" },
    { dias: 540, status: "COMPLETED" },
    { dias: 450, status: "COMPLETED" },
    { dias: 360, status: "COMPLETED" },
  ]);

  // "Veio Uma Vez": consulta única há 400 dias → sem ritmo conhecido
  await criarPaciente(clinicaA.id, medicoA.id, "Veio Uma Vez", [
    { dias: 400, status: "COMPLETED" },
  ]);

  // "Ritmo Leve": vinha a cada ~300 dias, sumiu há 330 → fator ~1.1
  await criarPaciente(clinicaA.id, medicoA.id, "Ritmo Leve", [
    { dias: 930, status: "COMPLETED" },
    { dias: 630, status: "COMPLETED" },
    { dias: 330, status: "COMPLETED" },
  ]);

  // "Tem Retorno": sumido há muito tempo, MAS já tem consulta marcada →
  // não deve aparecer, não faz sentido reativar quem já vai voltar.
  await criarPaciente(clinicaA.id, medicoA.id, "Tem Retorno", [
    { dias: 500, status: "COMPLETED" },
    { dias: 10, status: "SCHEDULED", futuro: true },
  ]);

  // "Veio Ontem": ativo, não é inativo
  await criarPaciente(clinicaA.id, medicoA.id, "Veio Ontem", [
    { dias: 1, status: "COMPLETED" },
  ]);

  // "So Faltou": nunca concluiu consulta → não é paciente reativável
  await criarPaciente(clinicaA.id, medicoA.id, "So Faltou", [
    { dias: 400, status: "NO_SHOW" },
  ]);

  // Clínica B, com um inativo próprio para provar isolamento
  const clinicaB = await prisma.clinic.create({
    data: { name: "Insights B", slug: `insights-b-${sufixo}` },
  });
  clinicaBId = clinicaB.id;
  const medicoB = await prisma.user.create({
    data: {
      clinicId: clinicaB.id, name: "Dr Bruno", email: `ins-bruno-${sufixo}@teste.local`,
      passwordHash: "x", role: "DOCTOR",
    },
  });
  await criarPaciente(clinicaB.id, medicoB.id, "Inativo Da Clinica B", [
    { dias: 700, status: "COMPLETED" },
  ]);
});

afterAll(async () => {
  for (const clinicId of [clinicaAId, clinicaBId].filter(Boolean)) {
    await prisma.appointment.deleteMany({ where: { clinicId } });
    await prisma.patient.deleteMany({ where: { clinicId } });
    await prisma.user.deleteMany({ where: { clinicId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
  }
  await prisma.$disconnect();
});

describe("findInactivePatients", () => {
  it("lista só quem tem consulta concluída e está fora do corte", async () => {
    const lista = await findInactivePatients({ clinicId: clinicaAId, mesesSemVir: 6 });
    const nomes = lista.map((p) => p.name);

    expect(nomes).toContain("Ritmo Quebrado");
    expect(nomes).toContain("Veio Uma Vez");
    expect(nomes).toContain("Ritmo Leve");
    // Ativo, nunca concluiu, ou já tem retorno marcado:
    expect(nomes).not.toContain("Veio Ontem");
    expect(nomes).not.toContain("So Faltou");
    expect(nomes).not.toContain("Tem Retorno");
  });

  it("prioriza quem quebrou o próprio ritmo, não quem sumiu há mais tempo", async () => {
    const lista = await findInactivePatients({ clinicId: clinicaAId, mesesSemVir: 6 });
    // "Veio Uma Vez" está sumido há mais tempo (400 dias) que "Ritmo Quebrado"
    // (360), mas este último quebrou um padrão trimestral — deve vir antes.
    expect(lista[0].name).toBe("Ritmo Quebrado");
    expect(lista[0].fatorAtraso).toBeGreaterThan(3);

    const semRitmo = lista.find((p) => p.name === "Veio Uma Vez")!;
    expect(semRitmo.fatorAtraso).toBeNull();
    expect(semRitmo.intervaloMedioDias).toBeNull();
  });

  it("calcula intervalo médio e total de consultas", async () => {
    const lista = await findInactivePatients({ clinicId: clinicaAId, mesesSemVir: 6 });
    const p = lista.find((x) => x.name === "Ritmo Quebrado")!;
    expect(p.totalConsultas).toBe(4);
    expect(p.intervaloMedioDias).toBe(90);
    expect(p.diasSemVir).toBeGreaterThanOrEqual(359);
  });

  it("respeita o corte de meses e o limite", async () => {
    const semCorte = await findInactivePatients({ clinicId: clinicaAId, mesesSemVir: 24 });
    // Só quem está sumido há mais de 24 meses (~730 dias): ninguém da clínica A
    expect(semCorte).toHaveLength(0);

    const limitado = await findInactivePatients({ clinicId: clinicaAId, mesesSemVir: 6, limite: 1 });
    expect(limitado).toHaveLength(1);
  });

  it("não vaza paciente inativo de outra clínica", async () => {
    const listaA = await findInactivePatients({ clinicId: clinicaAId, mesesSemVir: 6 });
    const listaB = await findInactivePatients({ clinicId: clinicaBId, mesesSemVir: 6 });

    expect(listaA.map((p) => p.name)).not.toContain("Inativo Da Clinica B");
    expect(listaB).toHaveLength(1);
    expect(listaB[0].name).toBe("Inativo Da Clinica B");
  });
});

describe("getAgendaStats", () => {
  beforeAll(async () => {
    // Agenda controlada nos últimos 20 dias: faltas concentradas no fim da tarde.
    const criar = async (diasAtrasN: number, hora: number, status: any) => {
      const d = diasAtras(diasAtrasN);
      d.setHours(hora, 0, 0, 0);
      await prisma.appointment.create({
        data: {
          clinicId: clinicaAId, patientId: idsPorNome["Veio Ontem"], doctorId: medicoAId,
          startsAt: d, endsAt: new Date(d.getTime() + 30 * 60000), status,
        },
      });
    };
    await criar(5, 9, "COMPLETED");
    await criar(5, 10, "COMPLETED");
    await criar(6, 16, "NO_SHOW");
    await criar(7, 17, "NO_SHOW");
    await criar(8, 16, "CANCELLED");
    await criar(9, 9, "COMPLETED");
  });

  it("calcula taxas e agrupa por faixa horária", async () => {
    const de = diasAtras(20);
    const ate = diasAtras(4);
    const stats = await getAgendaStats(clinicaAId, de, ate);

    expect(stats.total).toBe(6);
    expect(stats.porStatus.COMPLETED).toBe(3);
    expect(stats.porStatus.NO_SHOW).toBe(2);
    expect(stats.porStatus.CANCELLED).toBe(1);
    expect(stats.taxaFaltaPercent).toBeCloseTo(33.3, 0);

    const manha = stats.porFaixaHoraria.find((f) => f.faixa.startsWith("manhã"))!;
    const fimTarde = stats.porFaixaHoraria.find((f) => f.faixa.startsWith("fim da tarde"))!;
    expect(manha.total).toBe(3);
    expect(manha.faltas).toBe(0);
    // O padrão que a IA deve conseguir apontar: as duas faltas são do fim da tarde.
    expect(fimTarde.faltas).toBe(2);
    expect(fimTarde.cancelamentos).toBe(1);
  });

  it("omite faixas horárias sem nenhuma consulta", async () => {
    const stats = await getAgendaStats(clinicaAId, diasAtras(20), diasAtras(4));
    expect(stats.porFaixaHoraria.every((f) => f.total > 0)).toBe(true);
  });

  it("não conta consulta de outra clínica", async () => {
    const stats = await getAgendaStats(clinicaBId, diasAtras(2000), new Date());
    expect(stats.total).toBe(1); // só a consulta concluída do inativo da B
  });

  it("devolve zeros em vez de dividir por zero quando não há consulta", async () => {
    const stats = await getAgendaStats(clinicaAId, daquiADias(300), daquiADias(400));
    expect(stats.total).toBe(0);
    expect(stats.taxaFaltaPercent).toBe(0);
    expect(stats.diaMaisCheio).toBeNull();
  });
});
