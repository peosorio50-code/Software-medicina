import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

const anthropic = new Anthropic();

// Cada feature de IA usa o modelo mais barato que dá conta do trabalho.
// Tarefas simples (lembrete, mensagem) vão no Haiku; tarefas que exigem mais
// raciocínio clínico (prontuário, exames) sobem para um modelo mais forte.
export type AiFeatureType = "appointment_reminder";

const MODEL_BY_FEATURE: Record<AiFeatureType, string> = {
  appointment_reminder: "claude-haiku-4-5",
};

interface GenerateAiTextParams {
  clinicId: string;
  type: AiFeatureType;
  system: string;
  prompt: string;
  maxTokens?: number;
}

interface GenerateAiTextResult {
  output: string;
  interactionId: string;
}

// Chama a Claude e grava a interação (input, output, tokens) para auditoria
// e para medir consumo por clínica. Toda feature de IA deve passar por aqui,
// nunca chamar o SDK diretamente.
export async function generateAiText({
  clinicId,
  type,
  system,
  prompt,
  maxTokens = 512,
}: GenerateAiTextParams): Promise<GenerateAiTextResult> {
  const model = MODEL_BY_FEATURE[type];

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const output = textBlock?.type === "text" ? textBlock.text : "";

  const interaction = await prisma.aiInteraction.create({
    data: {
      clinicId,
      type,
      model,
      input: prompt,
      output,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  });

  return { output, interactionId: interaction.id };
}

interface RecordAiFeedbackParams {
  interactionId: string;
  clinicId: string;
  feedback: "OTIMO" | "BOM" | "RUIM";
  feedbackText?: string;
}

// clinicId sempre vem do JWT de quem chama a rota, nunca do corpo da
// requisição — mesma regra usada nas outras rotas do sistema.
export async function recordAiFeedback({
  interactionId,
  clinicId,
  feedback,
  feedbackText,
}: RecordAiFeedbackParams) {
  const existing = await prisma.aiInteraction.findFirst({
    where: { id: interactionId, clinicId },
  });
  if (!existing) return null;

  return prisma.aiInteraction.update({
    where: { id: existing.id },
    data: { feedback, feedbackText },
  });
}
