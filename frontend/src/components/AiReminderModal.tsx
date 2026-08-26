import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { AiBadge } from "./AiIcons";
import { AiDisclaimer, AiFeedback, AiLoading } from "./AiFeedback";

interface ReminderResponse {
  message: string;
  interactionId: string;
}

// Rascunho de lembrete de consulta. A mensagem vem editável de propósito: quem
// manda para o paciente é a clínica, e o texto tem que poder ser ajustado antes.
export function AiReminderModal({
  appointmentId,
  patientName,
  timeLabel,
  onClose,
}: {
  appointmentId: string;
  patientName: string;
  timeLabel: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        const data = await api.post<ReminderResponse>(
          `/ai/appointments/${appointmentId}/reminder`,
          {},
        );
        if (cancelled) return;
        setMessage(data.message);
        setInteractionId(data.interactionId);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Não foi possível gerar o lembrete agora.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    generate();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="modal-overlay active" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Lembrete de consulta gerado por IA"
      >
        <div className="modal-head">
          <div className="modal-title">
            <AiBadge /> Lembrete de consulta
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
              <path
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-sub">
            Rascunho de lembrete para <strong>{patientName}</strong> — {timeLabel}
          </p>

          {loading && <AiLoading>Gerando sugestão de mensagem...</AiLoading>}

          {!loading && error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              <textarea
                className="ai-message-box"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-label="Texto do lembrete"
              />
              <AiDisclaimer />
              <div className="ai-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Fechar
                </button>
                <button type="button" className="btn-new" onClick={copy}>
                  {copied ? "Copiado!" : "Copiar mensagem"}
                </button>
              </div>
              {interactionId && (
                <AiFeedback interactionId={interactionId} label="Essa sugestão ficou:" bordered />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
