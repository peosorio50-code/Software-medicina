import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { generateAiText, recordAiFeedback } from "../lib/ai";

export const aiRouter = Router();
aiRouter.use(requireAuth);

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
    if (err instanceof Anthropic.APIError) {
      console.error("Falha ao gerar lembrete via IA:", err.status, err.message);
      return res.status(502).json({ error: "Não foi possível gerar o lembrete agora. Tente novamente." });
    }
    throw err;
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
