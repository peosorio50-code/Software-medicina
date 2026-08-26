import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { InactivePatient } from "../types";
import { AiDisclaimer, AiFeedback, AiLoading } from "../components/AiFeedback";

interface ReengagementResponse {
  message: string;
  interactionId: string;
}

interface DraftState {
  loading: boolean;
  message?: string;
  interactionId?: string;
  error?: string;
}

// O ranking desta lista sai do banco, não da IA (ver backend/src/lib/
// clinicInsights.ts): quem sumiu é conta. A IA entra só ao clicar em
// "Gerar convite", para escrever o texto.
export function Reativacao() {
  const [meses, setMeses] = useState(6);
  const [patients, setPatients] = useState<InactivePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<InactivePatient[]>(`/ai/patients/inactive?meses=${meses}`);
        if (!cancelled) setPatients(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Erro ao carregar a lista.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [meses]);

  async function generate(patient: InactivePatient) {
    setDrafts((current) => ({ ...current, [patient.id]: { loading: true } }));
    try {
      const data = await api.post<ReengagementResponse>(
        `/ai/patients/${patient.id}/reengagement`,
        {},
      );
      setDrafts((current) => ({
        ...current,
        [patient.id]: { loading: false, message: data.message, interactionId: data.interactionId },
      }));
    } catch (err) {
      setDrafts((current) => ({
        ...current,
        [patient.id]: {
          loading: false,
          error: err instanceof ApiError ? err.message : "Não foi possível gerar o convite agora.",
        },
      }));
    }
  }

  function discard(patientId: string) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[patientId];
      return next;
    });
  }

  function updateDraft(patientId: string, message: string) {
    setDrafts((current) => ({ ...current, [patientId]: { ...current[patientId], message } }));
  }

  return (
    <section>
      <div className="topbar">
        <div>
          <h1>Reativação</h1>
          <div className="sub">
            Pacientes que pararam de voltar, ordenados por quem mais fugiu do próprio ritmo
          </div>
        </div>
      </div>

      <div className="filters-bar">
        <label className="stacked-field">
          Sem vir há mais de
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="panel">
        <div className="panel-head">
          <h2>Pacientes para retomar contato</h2>
          {!loading && (
            <span className="today-pill">
              {patients.length} {patients.length === 1 ? "paciente" : "pacientes"}
            </span>
          )}
        </div>

        {loading && (
          <p className="state-row">
            <span className="spinner" aria-hidden="true" /> Carregando...
          </p>
        )}

        {!loading && patients.length === 0 && (
          <div className="state-row">Nenhum paciente parado há mais de {meses} meses.</div>
        )}

        {!loading &&
          patients.map((p) => {
            const draft = drafts[p.id];
            return (
              <div key={p.id} className="lapsed-row">
                <div>
                  <div className="who-name">{p.name}</div>
                  <div className="lapsed-meta">
                    Última consulta há {Math.floor(p.diasSemVir / 30)} meses · {p.totalConsultas}{" "}
                    {p.totalConsultas === 1 ? "consulta" : "consultas"} no histórico
                    {p.intervaloMedioDias ? ` · vinha a cada ${p.intervaloMedioDias} dias` : ""}
                  </div>
                </div>

                {p.fatorAtraso === null ? (
                  <span className="lapsed-flag neutro">veio uma vez só</span>
                ) : (
                  <span className={`lapsed-flag ${p.fatorAtraso >= 2.5 ? "alto" : "medio"}`}>
                    {p.fatorAtraso}x o intervalo habitual
                  </span>
                )}

                <button
                  type="button"
                  className="btn-new"
                  onClick={() => generate(p)}
                  disabled={draft?.loading}
                >
                  Gerar convite
                </button>

                {draft && (
                  <div className="lapsed-msg">
                    {draft.loading && <AiLoading>Escrevendo o convite...</AiLoading>}

                    {draft.error && (
                      <p className="error" role="alert">
                        {draft.error}
                      </p>
                    )}

                    {draft.message !== undefined && (
                      <>
                        <textarea
                          className="ai-message-box"
                          rows={3}
                          value={draft.message}
                          onChange={(e) => updateDraft(p.id, e.target.value)}
                          aria-label={`Convite para ${p.name}`}
                        />
                        <AiDisclaimer />
                        <div className="ai-actions">
                          <button type="button" className="btn-secondary" onClick={() => discard(p.id)}>
                            Descartar
                          </button>
                          <button
                            type="button"
                            className="btn-new"
                            onClick={() => navigator.clipboard?.writeText(draft.message ?? "")}
                          >
                            Copiar mensagem
                          </button>
                        </div>
                        {draft.interactionId && (
                          <AiFeedback
                            interactionId={draft.interactionId}
                            label="Esse convite ficou:"
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}
