import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

// Ferramentas que a IA pode chamar para responder perguntas sobre os dados da
// clínica. Duas regras valem para todas elas:
//
// 1. O clinicId NUNCA vem do modelo — é fechado por closure a partir do JWT de
//    quem fez a pergunta (ver buildDataTools). A IA não tem como pedir dado de
//    outra clínica nem que a pergunta tente induzi-la a isso.
// 2. Elas devolvem apenas números agregados (contagens, somas), nunca nome de
//    paciente ou conteúdo clínico. Isso mantém dado sensível fora do prompt e
//    fora do registro de auditoria, além de sair mais barato.

export const dataToolDefinitions: Anthropic.Tool[] = [
  {
    name: "contar_pacientes",
    description:
      "Conta quantos pacientes da clínica atendem aos critérios informados. " +
      "Use para perguntas como 'quantos pacientes acima de 55 anos atendi nos últimos 2 meses'. " +
      "Retorna apenas a contagem, nunca a lista de nomes.",
    input_schema: {
      type: "object",
      properties: {
        idadeMinima: { type: "number", description: "Idade mínima em anos (inclusive)" },
        idadeMaxima: { type: "number", description: "Idade máxima em anos (inclusive)" },
        atendidoDe: {
          type: "string",
          description:
            "Data inicial (YYYY-MM-DD). Se informada, conta só pacientes com consulta nesse período.",
        },
        atendidoAte: { type: "string", description: "Data final (YYYY-MM-DD)" },
        apenasConsultasRealizadas: {
          type: "boolean",
          description:
            "Quando true (padrão), considera só consultas concluídas. False inclui agendadas e canceladas.",
        },
      },
      required: [],
    },
  },
  {
    name: "contar_consultas",
    description:
      "Conta consultas em um período, com o total por status (agendada, confirmada, concluída, cancelada, falta). " +
      "Use para perguntas sobre volume de atendimento, faltas e cancelamentos.",
    input_schema: {
      type: "object",
      properties: {
        de: { type: "string", description: "Data inicial (YYYY-MM-DD)" },
        ate: { type: "string", description: "Data final (YYYY-MM-DD)" },
        nomeMedico: {
          type: "string",
          description: "Filtra por um médico específico da clínica (busca por nome, parcial)",
        },
      },
      required: ["de", "ate"],
    },
  },
  {
    name: "resumo_financeiro",
    description:
      "Retorna os totais financeiros da clínica em um período: receitas, despesas, saldo, " +
      "valores recebidos e a receber, pacientes atendidos e ticket médio. Valores em reais.",
    input_schema: {
      type: "object",
      properties: {
        de: { type: "string", description: "Data inicial (YYYY-MM-DD)" },
        ate: { type: "string", description: "Data final (YYYY-MM-DD)" },
      },
      required: ["de", "ate"],
    },
  },
];

function subtractYears(date: Date, years: number) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() - years);
  return result;
}

// Converte "YYYY-MM-DD" em Date. endOfDay estica para o fim do dia, para que
// um intervalo "de 01/08 até 31/08" inclua o próprio dia 31 inteiro.
function parseDate(value: unknown, endOfDay = false): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = new Date(endOfDay ? `${value}T23:59:59.999` : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function contarPacientes(clinicId: string, input: Record<string, unknown>) {
  const hoje = new Date();
  const idadeMinima = toNumber(input.idadeMinima);
  const idadeMaxima = toNumber(input.idadeMaxima);
  const atendidoDe = parseDate(input.atendidoDe);
  const atendidoAte = parseDate(input.atendidoAte, true);
  const apenasRealizadas = input.apenasConsultasRealizadas !== false;

  // Idade vira faixa de data de nascimento: ter no mínimo 55 anos hoje é o
  // mesmo que ter nascido até a data de hoje menos 55 anos.
  const birthDate: { lte?: Date; gte?: Date } = {};
  if (idadeMinima !== undefined) birthDate.lte = subtractYears(hoje, idadeMinima);
  if (idadeMaxima !== undefined) birthDate.gte = subtractYears(hoje, idadeMaxima + 1);

  const temFiltroDeAtendimento = atendidoDe !== undefined || atendidoAte !== undefined;

  const count = await prisma.patient.count({
    where: {
      clinicId,
      ...(Object.keys(birthDate).length > 0 ? { birthDate } : {}),
      ...(temFiltroDeAtendimento
        ? {
            appointments: {
              some: {
                clinicId,
                ...(atendidoDe || atendidoAte
                  ? {
                      startsAt: {
                        ...(atendidoDe ? { gte: atendidoDe } : {}),
                        ...(atendidoAte ? { lte: atendidoAte } : {}),
                      },
                    }
                  : {}),
                ...(apenasRealizadas ? { status: "COMPLETED" as const } : {}),
              },
            },
          }
        : {}),
    },
  });

  return {
    quantidade: count,
    criterios: {
      idadeMinima: idadeMinima ?? null,
      idadeMaxima: idadeMaxima ?? null,
      atendidoDe: input.atendidoDe ?? null,
      atendidoAte: input.atendidoAte ?? null,
      apenasConsultasRealizadas: temFiltroDeAtendimento ? apenasRealizadas : null,
    },
  };
}

async function contarConsultas(clinicId: string, input: Record<string, unknown>) {
  const de = parseDate(input.de);
  const ate = parseDate(input.ate, true);
  if (!de || !ate) return { erro: "Informe 'de' e 'ate' no formato YYYY-MM-DD." };

  let doctorId: string | undefined;
  if (typeof input.nomeMedico === "string" && input.nomeMedico.trim() !== "") {
    const medico = await prisma.user.findFirst({
      where: { clinicId, name: { contains: input.nomeMedico, mode: "insensitive" } },
      select: { id: true },
    });
    if (!medico) return { erro: `Nenhum médico encontrado com o nome "${input.nomeMedico}".` };
    doctorId = medico.id;
  }

  const porStatus = await prisma.appointment.groupBy({
    by: ["status"],
    where: { clinicId, startsAt: { gte: de, lte: ate }, ...(doctorId ? { doctorId } : {}) },
    _count: { _all: true },
  });

  const contagem: Record<string, number> = {};
  let total = 0;
  for (const linha of porStatus) {
    contagem[linha.status] = linha._count._all;
    total += linha._count._all;
  }

  return { total, porStatus: contagem, periodo: { de: input.de, ate: input.ate } };
}

async function resumoFinanceiro(clinicId: string, input: Record<string, unknown>) {
  const de = parseDate(input.de);
  const ate = parseDate(input.ate, true);
  if (!de || !ate) return { erro: "Informe 'de' e 'ate' no formato YYYY-MM-DD." };

  const transacoes = await prisma.financeTransaction.findMany({
    where: { clinicId, date: { gte: de, lte: ate } },
    select: { type: true, status: true, amount: true, patientId: true },
  });

  const soma = (lista: typeof transacoes) => lista.reduce((acc, t) => acc + t.amount, 0);
  const receitas = transacoes.filter((t) => t.type === "INCOME");
  const despesas = transacoes.filter((t) => t.type === "EXPENSE");
  const recebido = soma(receitas.filter((t) => t.status === "COMPLETED"));
  const pacientesAtendidos = new Set(
    receitas.filter((t) => t.status === "COMPLETED").map((t) => t.patientId).filter(Boolean),
  ).size;

  return {
    periodo: { de: input.de, ate: input.ate },
    totalReceitas: soma(receitas),
    totalDespesas: soma(despesas),
    saldo: soma(receitas) - soma(despesas),
    recebido,
    aReceber: soma(receitas.filter((t) => t.status === "PENDING")),
    cancelado: soma(receitas.filter((t) => t.status === "CANCELLED")),
    pacientesAtendidos,
    ticketMedio: pacientesAtendidos > 0 ? recebido / pacientesAtendidos : 0,
  };
}

export type DataToolRunner = (name: string, input: unknown) => Promise<unknown>;

// Devolve o executor das ferramentas já amarrado a uma clínica. O clinicId
// entra aqui uma única vez, vindo do JWT, e não é parâmetro de nenhuma tool.
export function buildDataTools(clinicId: string): DataToolRunner {
  return async (name, rawInput) => {
    const input = (rawInput ?? {}) as Record<string, unknown>;
    switch (name) {
      case "contar_pacientes":
        return contarPacientes(clinicId, input);
      case "contar_consultas":
        return contarConsultas(clinicId, input);
      case "resumo_financeiro":
        return resumoFinanceiro(clinicId, input);
      default:
        return { erro: `Ferramenta desconhecida: ${name}` };
    }
  };
}
