import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

const anthropic = new Anthropic();

// Cada feature de IA usa o modelo mais barato que dá conta do trabalho.
// Tarefas simples (lembrete, mensagem) vão no Haiku; tarefas que exigem mais
// raciocínio (consultar dados, analisar o financeiro) sobem para um modelo
// mais forte, onde errar custa mais caro que a diferença de preço.
export type AiFeatureType = "appointment_reminder" | "data_assistant" | "finance_summary";

const MODEL_BY_FEATURE: Record<AiFeatureType, string> = {
  appointment_reminder: "claude-haiku-4-5",
  data_assistant: "claude-opus-5",
  finance_summary: "claude-opus-5",
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

interface GenerateAiWithToolsParams {
  clinicId: string;
  type: AiFeatureType;
  system: string;
  prompt: string;
  tools: Anthropic.Tool[];
  runTool: (name: string, input: unknown) => Promise<unknown>;
  maxTokens?: number;
  maxIterations?: number;
}

interface GenerateAiWithToolsResult {
  output: string;
  interactionId: string;
  toolsUsed: string[];
}

// Igual a generateAiText, mas dá à IA um conjunto de ferramentas que ela pode
// chamar para buscar dados reais no banco antes de responder. A contagem/soma
// é sempre feita pelo Postgres, não pelo modelo — ele só decide qual pergunta
// fazer e como redigir a resposta.
export async function generateAiWithTools({
  clinicId,
  type,
  system,
  prompt,
  tools,
  runTool,
  maxTokens = 2048,
  maxIterations = 6,
}: GenerateAiWithToolsParams): Promise<GenerateAiWithToolsResult> {
  const model = MODEL_BY_FEATURE[type];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  const toolsUsed: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let output = "";

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      tools,
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    const textBlock = response.content.find((block) => block.type === "text");
    if (textBlock?.type === "text") output = textBlock.text;

    if (response.stop_reason !== "tool_use") break;

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (toolUseBlocks.length === 0) break;

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      toolsUsed.push(block.name);
      let result: unknown;
      try {
        result = await runTool(block.name, block.input);
      } catch (err) {
        // Uma consulta que falha não pode derrubar a conversa inteira: devolve
        // o erro como resultado para a IA explicar o que não deu certo.
        console.error(`Falha ao executar ferramenta de IA "${block.name}":`, err);
        result = { erro: "Não foi possível consultar esse dado." };
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  const interaction = await prisma.aiInteraction.create({
    data: { clinicId, type, model, input: prompt, output, inputTokens, outputTokens },
  });

  return { output, interactionId: interaction.id, toolsUsed };
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
