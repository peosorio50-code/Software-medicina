import Anthropic from "@anthropic-ai/sdk";
import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { generateAiText, generateAiWithTools, recordAiFeedback } from "../lib/ai";
import { buildDataTools, dataToolDefinitions } from "../lib/aiTools";
import { findInactivePatients, getAgendaStats } from "../lib/clinicInsights";

export const aiRouter = Router();
aiRouter.use(requireAuth);

// Falha de rede/quota na API da IA não pode derrubar o processo nem vazar
// detalhe técnico para o cliente: vira 502 com mensagem amigável.
function handleAiError(err: unknown, res: Response, contexto: string) {
  if (err instanceof Anthropic.APIError) {
    console.error(`Falha de IA (${contexto}):`, err.status, err.message);
    res.status(502).json({ error: "A IA não está disponível no momento. Tente novamente." });
    return true;
  }
  return false;
}

// A data de hoje entra no fim do prompt (não no system) para não invalidar
// o cache do prefixo quando passarmos a usar prompt caching.
function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

const REMINDER_SYSTEM_PROMPT = `Você escreve mensagens de lembrete de consulta para uma clínica médica, em português do Brasil.
Regras:
- Tom cordial e profissional, direto ao ponto.
- Até 400 caracteres, pronta para enviar por WhatsApp ou e-mail.
- Inclua data, horário e nome do médico.
- Nunca inclua informação clínica, diagnóstico, orientação médica ou opinião — isso não é uma mensagem clínica, é só a confirmação do agendamento.
- Responda apenas com o texto da mensagem, sem comentários extras.`;

// Gera um rascunho de lembrete para uma consulta específica. Quem envia
// (e decide se envia) é a clínica — isso só entrega uma sugestão de texto.
aiRouter.post("/appointments/:id/reminder", async (req, res) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
    include: {
      patient: { select: { name: true } },
      doctor: { select: { name: true } },
      clinic: { select: { name: true } },
    },
  });
  if (!appointment) return res.status(404).json({ error: "Consulta não encontrada" });

  const prompt = `Clínica: ${appointment.clinic.name}
Paciente: ${appointment.patient.name}
Médico(a): ${appointment.doctor.name}
Data/hora da consulta: ${appointment.startsAt.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}

Escreva a mensagem de lembrete para este paciente.`;

  try {
    const { output, interactionId } = await generateAiText({
      clinicId: req.auth!.clinicId,
      type: "appointment_reminder",
      system: REMINDER_SYSTEM_PROMPT,
      prompt,
    });
    res.json({ message: output, interactionId });
  } catch (err) {
    if (!handleAiError(err, res, "lembrete de consulta")) throw err;
  }
});

const ASSISTANT_SYSTEM_PROMPT = `Você é o assistente de dados de uma clínica médica no Brasil. Responde em português do Brasil.

Como trabalhar:
- Use as ferramentas disponíveis para buscar os números no banco de dados da clínica. Nunca invente ou estime um número: se não conseguir obter o dado por uma ferramenta, diga que não tem essa informação.
- Converta períodos ditos em linguagem natural ("últimos 2 meses", "este ano") em datas concretas usando a data de hoje informada no final da pergunta.
- Se a pergunta for ambígua a ponto de mudar a resposta (por exemplo, não dá para saber o período), pergunte antes de responder.

Como responder:
- Direto e curto: a resposta em uma frase, e no máximo mais duas de contexto relevante.
- Diga o período considerado, para a pessoa conferir se era o que ela queria.
- Não dê conselho clínico nem interprete dado de saúde de paciente — você responde sobre gestão e números da clínica.`;

const askSchema = z.object({ question: z.string().min(3).max(500) });

// Assistente de dados: a pessoa pergunta em português, a IA escolhe quais
// consultas fazer e o Postgres devolve os números reais. Ver lib/aiTools.ts
// para as regras de isolamento por clínica.
aiRouter.post("/ask", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const prompt = `Pergunta: ${parsed.data.question}

(Data de hoje: ${hojeISO()})`;

  try {
    const { output, interactionId, toolsUsed } = await generateAiWithTools({
      clinicId: req.auth!.clinicId,
      type: "data_assistant",
      system: ASSISTANT_SYSTEM_PROMPT,
      prompt,
      tools: dataToolDefinitions,
      runTool: buildDataTools(req.auth!.clinicId),
    });
    res.json({ answer: output, interactionId, toolsUsed });
  } catch (err) {
    if (!handleAiError(err, res, "assistente de dados")) throw err;
  }
});

const FINANCE_SYSTEM_PROMPT = `Você analisa o resultado financeiro de uma clínica médica no Brasil e escreve um resumo curto para o dono da clínica. Responde em português do Brasil.

Regras:
- Baseie-se apenas nos números fornecidos. Não invente valores, metas ou comparações com períodos que não foram informados.
- Comece por uma frase com o resultado do período (saldo positivo ou negativo e quanto).
- Depois, no máximo três pontos curtos, destaque o que mais chama atenção: inadimplência (valor a receber alto), despesas altas frente à receita, ticket médio, volume de pacientes.
- Se algum número sugerir um problema, diga qual é o problema em vez de só repetir o número.
- Valores em reais, no formato R$ 1.234,56.
- Não dê conselho de investimento, tributário ou contábil.`;

const financeSummarySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

// Resumo do financeiro em linguagem natural. Diferente do /ask, aqui os dados
// já vão prontos no prompt — o período é escolhido na tela, não pela IA.
aiRouter.post("/finance/summary", async (req, res) => {
  const parsed = financeSummarySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);
  const fimDeHoje = new Date();
  fimDeHoje.setHours(23, 59, 59, 999);

  const de = parsed.data.from ? new Date(parsed.data.from) : inicioDoMes;
  const ate = parsed.data.to ? new Date(parsed.data.to) : fimDeHoje;
  if (Number.isNaN(de.getTime()) || Number.isNaN(ate.getTime())) {
    return res.status(400).json({ error: "Datas inválidas" });
  }

  const dados = await buildDataTools(req.auth!.clinicId)("resumo_financeiro", {
    de: de.toISOString().slice(0, 10),
    ate: ate.toISOString().slice(0, 10),
  });

  const prompt = `Resultado financeiro da clínica no período:

${JSON.stringify(dados, null, 2)}

Escreva o resumo para o dono da clínica.`;

  try {
    const { output, interactionId } = await generateAiText({
      clinicId: req.auth!.clinicId,
      type: "finance_summary",
      system: FINANCE_SYSTEM_PROMPT,
      prompt,
      maxTokens: 1024,
    });
    res.json({ summary: output, interactionId, data: dados });
  } catch (err) {
    if (!handleAiError(err, res, "resumo financeiro")) throw err;
  }
});

// ---------- Reativação de pacientes inativos ----------

const inactiveQuerySchema = z.object({
  meses: z.coerce.number().min(1).max(60).optional(),
  limite: z.coerce.number().min(1).max(50).optional(),
});

// Quem sumiu é conta, não IA: o ranking sai do histórico de cada paciente
// (ver lib/clinicInsights.ts). Esta rota não gasta token nenhum.
aiRouter.get("/patients/inactive", async (req, res) => {
  const parsed = inactiveQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pacientes = await findInactivePatients({
    clinicId: req.auth!.clinicId,
    mesesSemVir: parsed.data.meses,
    limite: parsed.data.limite,
  });
  res.json(pacientes);
});

const REENGAGEMENT_SYSTEM_PROMPT = `Você escreve mensagens de reaproximação para pacientes que não voltam a um consultório médico no Brasil há um tempo. Responde em português do Brasil.

Regras:
- Tom cordial e acolhedor, nunca comercial ou insistente. É um convite, não uma cobrança.
- Até 400 caracteres, pronta para enviar por WhatsApp.
- Nunca mencione diagnóstico, sintoma, tratamento, exame ou qualquer informação clínica — você não sabe por que o paciente foi à consulta e não deve especular.
- Nunca sugira que o paciente precisa de atendimento por algum motivo de saúde. O motivo do contato é só o tempo desde a última visita.
- Não invente promoção, desconto, campanha ou disponibilidade de horário.
- Não diga há exatamente quantos dias a pessoa não vem (soa como cobrança); fale de forma leve ("faz um tempo").
- Responda apenas com o texto da mensagem, sem comentários extras.`;

// Rascunho de mensagem para trazer de volta um paciente específico.
aiRouter.post("/patients/:id/reengagement", async (req, res) => {
  const paciente = await prisma.patient.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
    select: {
      name: true,
      clinic: { select: { name: true } },
      appointments: {
        where: { status: "COMPLETED" },
        select: { startsAt: true },
        orderBy: { startsAt: "desc" },
        take: 1,
      },
    },
  });
  if (!paciente) return res.status(404).json({ error: "Paciente não encontrado" });

  const ultima = paciente.appointments[0];
  if (!ultima) {
    return res.status(400).json({ error: "Paciente ainda não tem consulta concluída" });
  }

  const meses = Math.floor(
    (Date.now() - ultima.startsAt.getTime()) / (30 * 24 * 60 * 60 * 1000),
  );

  const prompt = `Clínica: ${paciente.clinic.name}
Paciente: ${paciente.name}
Tempo aproximado desde a última consulta: ${meses} meses

Escreva a mensagem de reaproximação para este paciente.`;

  try {
    const { output, interactionId } = await generateAiText({
      clinicId: req.auth!.clinicId,
      type: "patient_reengagement",
      system: REENGAGEMENT_SYSTEM_PROMPT,
      prompt,
    });
    res.json({ message: output, interactionId });
  } catch (err) {
    if (!handleAiError(err, res, "reativação de paciente")) throw err;
  }
});

// ---------- Insights da agenda ----------

const AGENDA_INSIGHTS_SYSTEM_PROMPT = `Você analisa a agenda de um consultório médico no Brasil e escreve uma leitura curta para quem administra a clínica. Responde em português do Brasil.

Regras:
- Baseie-se apenas nos números fornecidos. Não invente comparações com períodos que não foram informados nem estime valores.
- Comece com uma frase sobre o volume e a saúde geral da agenda no período.
- Depois, no máximo três pontos curtos. Priorize padrão acionável (por exemplo, faltas concentradas numa faixa de horário) em vez de repetir números que a pessoa já vê na tela.
- Para cada ponto problemático, sugira uma ação administrativa concreta e realista (confirmar véspera, abrir encaixe, remanejar horário). Deixe claro que é sugestão.
- Se a amostra for pequena demais para concluir algo (poucas consultas no período), diga isso em vez de tirar conclusão de um ou dois casos.
- Não fale de conduta clínica, diagnóstico ou tratamento — apenas gestão de agenda.`;

const agendaInsightsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

aiRouter.post("/agenda/insights", async (req, res) => {
  const parsed = agendaInsightsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  trintaDiasAtras.setHours(0, 0, 0, 0);
  const fimDeHoje = new Date();
  fimDeHoje.setHours(23, 59, 59, 999);

  const de = parsed.data.from ? new Date(parsed.data.from) : trintaDiasAtras;
  const ate = parsed.data.to ? new Date(parsed.data.to) : fimDeHoje;
  if (Number.isNaN(de.getTime()) || Number.isNaN(ate.getTime())) {
    return res.status(400).json({ error: "Datas inválidas" });
  }

  const stats = await getAgendaStats(req.auth!.clinicId, de, ate);

  const prompt = `Números da agenda no período:

${JSON.stringify(stats, null, 2)}

Escreva a leitura da agenda para quem administra a clínica.`;

  try {
    const { output, interactionId } = await generateAiText({
      clinicId: req.auth!.clinicId,
      type: "agenda_insights",
      system: AGENDA_INSIGHTS_SYSTEM_PROMPT,
      prompt,
      maxTokens: 1024,
    });
    res.json({ insights: output, interactionId, data: stats });
  } catch (err) {
    if (!handleAiError(err, res, "insights da agenda")) throw err;
  }
});

const feedbackSchema = z.object({
  feedback: z.enum(["OTIMO", "BOM", "RUIM"]),
  feedbackText: z.string().optional(),
});

// Feedback de quem usou a sugestão de IA — não é aprovação/rejeição de uma
// decisão clínica, é só sinal de qualidade para sabermos se a IA está ajudando.
aiRouter.post("/interactions/:id/feedback", async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await recordAiFeedback({
    interactionId: req.params.id,
    clinicId: req.auth!.clinicId,
    feedback: parsed.data.feedback,
    feedbackText: parsed.data.feedbackText,
  });
  if (!updated) return res.status(404).json({ error: "Interação não encontrada" });

  res.json(updated);
});
