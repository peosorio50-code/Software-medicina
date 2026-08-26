import { prisma } from "./prisma";

// Análises de dados da clínica que alimentam as features de IA.
//
// Nada aqui usa modelo de linguagem de propósito: encontrar quem sumiu e medir
// a agenda é conta, e conta o Postgres faz com exatidão. A IA entra depois,
// só para escrever o texto em cima destes números — usar modelo para calcular
// seria mais caro, mais lento e sujeito a erro.

export interface InactivePatient {
  id: string;
  name: string;
  phone: string | null;
  ultimaConsulta: Date;
  diasSemVir: number;
  totalConsultas: number;
  // Intervalo médio entre consultas desse paciente, quando ele tem histórico
  // suficiente para isso significar alguma coisa (2+ consultas).
  intervaloMedioDias: number | null;
  // Quantas vezes o tempo de sumiço passou do ritmo habitual do paciente.
  // Quem vinha a cada 3 meses e sumiu há 9 tem fator 3 — é mais relevante que
  // quem veio uma vez só e sumiu há 9 meses.
  fatorAtraso: number | null;
}

interface FindInactiveParams {
  clinicId: string;
  mesesSemVir?: number;
  limite?: number;
}

export async function findInactivePatients({
  clinicId,
  mesesSemVir = 6,
  limite = 20,
}: FindInactiveParams): Promise<InactivePatient[]> {
  const corte = new Date();
  corte.setMonth(corte.getMonth() - mesesSemVir);

  // Só interessa quem já foi paciente de verdade (tem consulta concluída) e
  // não tem nenhuma consulta futura marcada — quem já vai voltar não precisa
  // ser reativado.
  const pacientes = await prisma.patient.findMany({
    where: {
      clinicId,
      appointments: { some: { clinicId, status: "COMPLETED" } },
      NOT: {
        appointments: {
          some: {
            clinicId,
            startsAt: { gte: new Date() },
            status: { in: ["SCHEDULED", "CONFIRMED"] },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      appointments: {
        where: { clinicId, status: "COMPLETED" },
        select: { startsAt: true },
        orderBy: { startsAt: "asc" },
      },
    },
  });

  const agora = Date.now();
  const UM_DIA = 24 * 60 * 60 * 1000;

  const inativos: InactivePatient[] = [];
  for (const paciente of pacientes) {
    const datas = paciente.appointments.map((a) => a.startsAt);
    const ultimaConsulta = datas[datas.length - 1];
    if (!ultimaConsulta || ultimaConsulta >= corte) continue;

    const diasSemVir = Math.floor((agora - ultimaConsulta.getTime()) / UM_DIA);

    let intervaloMedioDias: number | null = null;
    if (datas.length >= 2) {
      const intervalos = datas
        .slice(1)
        .map((data, i) => (data.getTime() - datas[i].getTime()) / UM_DIA);
      intervaloMedioDias = Math.round(
        intervalos.reduce((acc, n) => acc + n, 0) / intervalos.length,
      );
    }

    inativos.push({
      id: paciente.id,
      name: paciente.name,
      phone: paciente.phone,
      ultimaConsulta,
      diasSemVir,
      totalConsultas: datas.length,
      intervaloMedioDias,
      fatorAtraso:
        intervaloMedioDias && intervaloMedioDias > 0
          ? Number((diasSemVir / intervaloMedioDias).toFixed(1))
          : null,
    });
  }

  // Quem tem ritmo conhecido e o quebrou vem primeiro (maior fator de atraso).
  // Sem ritmo conhecido, desempata por quem está sumido há mais tempo.
  inativos.sort((a, b) => {
    if (a.fatorAtraso !== null && b.fatorAtraso !== null) return b.fatorAtraso - a.fatorAtraso;
    if (a.fatorAtraso !== null) return -1;
    if (b.fatorAtraso !== null) return 1;
    return b.diasSemVir - a.diasSemVir;
  });

  return inativos.slice(0, limite);
}

export interface AgendaStats {
  periodo: { de: string; ate: string };
  total: number;
  porStatus: Record<string, number>;
  taxaFaltaPercent: number;
  taxaCancelamentoPercent: number;
  // Faltas e cancelamentos por faixa de horário revelam padrão acionável:
  // "quase toda falta é no fim da tarde" muda o que a clínica faz a respeito.
  porFaixaHoraria: {
    faixa: string;
    total: number;
    faltas: number;
    cancelamentos: number;
  }[];
  diaMaisCheio: { dia: string; total: number } | null;
}

const FAIXAS: [string, number, number][] = [
  ["manhã (até 12h)", 0, 12],
  ["início da tarde (12h-15h)", 12, 15],
  ["fim da tarde (15h-18h)", 15, 18],
  ["noite (18h em diante)", 18, 24],
];

const DIAS_SEMANA = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado",
];

export async function getAgendaStats(
  clinicId: string,
  de: Date,
  ate: Date,
): Promise<AgendaStats> {
  const consultas = await prisma.appointment.findMany({
    where: { clinicId, startsAt: { gte: de, lte: ate } },
    select: { startsAt: true, status: true },
  });

  const porStatus: Record<string, number> = {};
  const porFaixa = FAIXAS.map(([faixa]) => ({ faixa, total: 0, faltas: 0, cancelamentos: 0 }));
  const porDia: Record<string, number> = {};

  for (const consulta of consultas) {
    porStatus[consulta.status] = (porStatus[consulta.status] ?? 0) + 1;

    const hora = consulta.startsAt.getHours();
    const indice = FAIXAS.findIndex(([, inicio, fim]) => hora >= inicio && hora < fim);
    if (indice >= 0) {
      porFaixa[indice].total++;
      if (consulta.status === "NO_SHOW") porFaixa[indice].faltas++;
      if (consulta.status === "CANCELLED") porFaixa[indice].cancelamentos++;
    }

    const dia = DIAS_SEMANA[consulta.startsAt.getDay()];
    porDia[dia] = (porDia[dia] ?? 0) + 1;
  }

  const total = consultas.length;
  const percent = (n: number) => (total > 0 ? Number(((n / total) * 100).toFixed(1)) : 0);

  const diasOrdenados = Object.entries(porDia).sort((a, b) => b[1] - a[1]);

  return {
    periodo: { de: de.toISOString().slice(0, 10), ate: ate.toISOString().slice(0, 10) },
    total,
    porStatus,
    taxaFaltaPercent: percent(porStatus.NO_SHOW ?? 0),
    taxaCancelamentoPercent: percent(porStatus.CANCELLED ?? 0),
    porFaixaHoraria: porFaixa.filter((f) => f.total > 0),
    diaMaisCheio: diasOrdenados.length > 0
      ? { dia: diasOrdenados[0][0], total: diasOrdenados[0][1] }
      : null,
  };
}
