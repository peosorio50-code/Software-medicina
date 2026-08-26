import { useState } from "react";
import { ApiError } from "../api";
import { AiBadge } from "./AiIcons";
import { AiDisclaimer, AiFeedback, AiLoading } from "./AiFeedback";

interface AiTextResult {
  text: string;
  interactionId: string;
}

// Painel "gerar uma leitura em texto sobre estes números": usado pelos insights
// da agenda e pelo resumo financeiro. A conta vem do banco; a IA só escreve por
// cima dela, então nada aqui é gerado antes de a pessoa pedir — chamada de
// modelo custa, e ninguém quer pagar por análise que não vai ler.
export function AiInsightPanel({
  title,
  description,
  buttonLabel,
  loadingLabel,
  feedbackLabel,
  onGenerate,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  loadingLabel: string;
  feedbackLabel: string;
  onGenerate: () => Promise<AiTextResult>;
}) {
  const [result, setResult] = useState<AiTextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setResult(await onGenerate());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível gerar a análise agora.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel ai-panel" style={{ marginBottom: "1.25rem" }}>
      <div className="panel-head">
        <h2>
          <AiBadge /> {title}
        </h2>
        <button type="button" className="btn-secondary" onClick={generate} disabled={loading}>
          {result ? "Gerar de novo" : buttonLabel}
        </button>
      </div>
      <div className="panel-body" style={{ borderBottom: "none" }}>
        {loading && <AiLoading>{loadingLabel}</AiLoading>}

        {!loading && error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && !result && <p className="muted">{description}</p>}

        {!loading && !error && result && (
          <>
            <div className="ai-summary-text">
              {result.text.split("\n").filter(Boolean).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <AiDisclaimer />
            <AiFeedback interactionId={result.interactionId} label={feedbackLabel} />
          </>
        )}
      </div>
    </div>
  );
}
