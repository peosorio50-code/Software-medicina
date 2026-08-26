import { useState } from "react";
import { api } from "../api";

type FeedbackKind = "OTIMO" | "BOM" | "RUIM";

// Sinal de qualidade da sugestão de IA — não é aprovação de decisão clínica.
// Vai para POST /ai/interactions/:id/feedback, que grava em AiInteraction.
//
// Pode existir mais de um destes na mesma tela (uma resposta do assistente por
// vez), por isso o estado é do componente e nunca global.
export function AiFeedback({
  interactionId,
  label,
  bordered = false,
}: {
  interactionId: string;
  label: string;
  bordered?: boolean;
}) {
  const [selected, setSelected] = useState<FeedbackKind | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  async function send(kind: FeedbackKind, feedbackText?: string) {
    try {
      await api.post(`/ai/interactions/${interactionId}/feedback`, {
        feedback: kind,
        ...(feedbackText ? { feedbackText } : {}),
      });
    } catch {
      // Feedback é sinal auxiliar: se falhar, não vale interromper o fluxo de
      // quem está atendendo. O agradecimento na tela permanece.
    }
  }

  function choose(kind: FeedbackKind) {
    setSelected(kind);
    // "Ruim" abre a caixa de texto e só envia no botão, para não gravar duas
    // vezes a mesma interação.
    if (kind !== "RUIM") {
      setSent(true);
      void send(kind);
    }
  }

  const style = bordered
    ? { marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }
    : undefined;

  return (
    <div className={`feedback-block${bordered ? "" : " qa-feedback"}`} style={style}>
      <div className="feedback-row">
        <span className="feedback-label">{label}</span>
        <button
          type="button"
          className={`feedback-btn otimo${selected === "OTIMO" ? " selected" : ""}`}
          onClick={() => choose("OTIMO")}
        >
          Ótima
        </button>
        <button
          type="button"
          className={`feedback-btn bom${selected === "BOM" ? " selected" : ""}`}
          onClick={() => choose("BOM")}
        >
          Boa
        </button>
        <button
          type="button"
          className={`feedback-btn ruim${selected === "RUIM" ? " selected" : ""}`}
          onClick={() => choose("RUIM")}
        >
          Ruim
        </button>
      </div>

      <div className="feedback-extra">
        {sent && <div className="feedback-thanks" style={{ marginTop: "0.6rem" }}>Obrigado pelo feedback!</div>}

        {selected === "RUIM" && !sent && (
          <>
            <textarea
              className="feedback-note"
              placeholder="O que ficou ruim nessa resposta? (opcional, ajuda a melhorar a IA)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: "0.6rem" }}
              onClick={() => {
                setSent(true);
                void send("RUIM", note.trim() || undefined);
              }}
            >
              Enviar feedback
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Nota curta para sugestões corriqueiras; caixa de aviso destacada só quando a
// sugestão tem peso maior (algo que vai ser enviado a um paciente).
export function AiDisclaimer({ sensitive = false }: { sensitive?: boolean }) {
  if (sensitive) {
    return (
      <div className="ai-disclaimer">
        <strong>Sugestão da IA.</strong> Revise antes de mandar — quem decide e confirma é sempre a clínica.
      </div>
    );
  }
  return (
    <p className="ai-note">
      <strong>Sugestão da IA.</strong>
    </p>
  );
}

export function AiLoading({ children }: { children: React.ReactNode }) {
  return (
    <div className="ai-loading">
      <span className="ai-spinner" aria-hidden="true" /> {children}
    </div>
  );
}
