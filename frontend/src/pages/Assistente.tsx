import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import { RobotIcon } from "../components/AiIcons";
import { AiFeedback, AiLoading } from "../components/AiFeedback";

interface AskResponse {
  answer: string;
  interactionId: string;
  toolsUsed: string[];
}

interface QaItem {
  id: number;
  question: string;
  answer?: string;
  interactionId?: string;
  toolsUsed?: string[];
  error?: string;
}

const SUGESTOES = [
  "Quantos pacientes acima de 55 anos atendi nos últimos 2 meses?",
  "Quantas consultas tive este mês e quantas foram canceladas?",
  "Qual foi meu faturamento no mês passado?",
  "Quantos pacientes faltaram nas últimas 4 semanas?",
];

export function Assistente() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QaItem[]>([]);
  const [pending, setPending] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const texto = question.trim();
    if (texto.length < 3 || pending) return;

    const id = Date.now();
    setHistory((current) => [{ id, question: texto }, ...current]);
    setQuestion("");
    setPending(true);

    try {
      const data = await api.post<AskResponse>("/ai/ask", { question: texto });
      setHistory((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, answer: data.answer, interactionId: data.interactionId, toolsUsed: data.toolsUsed }
            : item,
        ),
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Não foi possível consultar os dados agora.";
      setHistory((current) =>
        current.map((item) => (item.id === id ? { ...item, error: message } : item)),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <div className="topbar">
        <div>
          <h1>Assistente</h1>
          <div className="sub">Pergunte em português sobre os dados do seu consultório</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1.25rem" }}>
        <div className="panel-body" style={{ borderBottom: "none" }}>
          <form className="ask-box" onSubmit={ask}>
            <textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: quantos pacientes acima de 55 anos atendi nos últimos 2 meses?"
              aria-label="Sua pergunta"
            />
            <button type="submit" className="btn-new" disabled={pending || question.trim().length < 3}>
              Perguntar
            </button>
          </form>

          <div className="suggestion-chips">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" className="suggestion-chip" onClick={() => setQuestion(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>Respostas</h2>
          </div>
          {history.map((item) => (
            <div key={item.id} className="qa-item">
              <div className="qa-question">{item.question}</div>

              {!item.answer && !item.error && <AiLoading>Consultando os dados da clínica...</AiLoading>}

              {item.error && (
                <p className="error" role="alert">
                  {item.error}
                </p>
              )}

              {item.answer && (
                <>
                  <div className="qa-answer">
                    <span className="qa-robot">
                      <RobotIcon />
                    </span>
                    <div>
                      <div>{item.answer}</div>
                      {!!item.toolsUsed?.length && (
                        <div className="qa-source">
                          Consultou{" "}
                          {item.toolsUsed.map((tool, i) => (
                            <code key={`${tool}-${i}`}>{tool}</code>
                          ))}{" "}
                          no banco da clínica
                        </div>
                      )}
                    </div>
                  </div>
                  {item.interactionId && (
                    <AiFeedback interactionId={item.interactionId} label="Essa resposta ficou:" />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
