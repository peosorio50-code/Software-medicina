import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Layout } from "../components/Layout";
import { api, ApiError } from "../api";
import { DOCUMENT_KIND_LABEL } from "../types";
import type { Patient, DocumentKind } from "../types";

interface PatientSummary {
  patient: Patient;
  completedAppointments: number;
  cancelledAppointments: number;
  totalPaid: number;
  documents: { id: string; kind: DocumentKind; title: string; status: string; createdAt: string }[];
}

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, PatientSummary>>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api.get<Patient[]>(`/patients${query}`);
      setPatients(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!summaries[id]) {
      try {
        const summary = await api.get<PatientSummary>(`/patients/${id}/summary`);
        setSummaries((prev) => ({ ...prev, [id]: summary }));
      } catch {
        // silencioso: resumo é informação adicional
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/patients", {
        name,
        phone: phone || undefined,
        email: email || undefined,
        birthDate: birthDate || undefined,
        notes: notes || undefined,
      });
      setName("");
      setPhone("");
      setEmail("");
      setBirthDate("");
      setNotes("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao adicionar paciente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Pacientes</h1>
          <p>Cadastro e histórico de atendimentos de cada paciente.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Adicionar paciente"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div className="card">
          <h2>Novo paciente</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Nome completo
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Telefone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Data de nascimento
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Observações
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar paciente"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <input
          placeholder="Buscar paciente por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "1rem", width: "100%" }}
        />

        {loading && <p>Carregando...</p>}
        {!loading && patients.length === 0 && <p className="muted">Nenhum paciente cadastrado.</p>}

        <ul className="list-plain">
          {patients.map((p) => {
            const summary = summaries[p.id];
            const isOpen = expandedId === p.id;
            return (
              <li key={p.id} className="card" style={{ padding: "0.9rem 1rem" }}>
                <div className="row-between" style={{ cursor: "pointer" }} onClick={() => toggleExpand(p.id)}>
                  <div>
                    <strong>{p.name}</strong>
                    <div className="muted">
                      {p.phone ?? "sem telefone"} · {p.email ?? "sem e-mail"}
                      {p.birthDate ? ` · nasc. ${new Date(p.birthDate).toLocaleDateString("pt-BR")}` : ""}
                    </div>
                  </div>
                  <span className="muted">{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div style={{ marginTop: "0.9rem", borderTop: "1px solid var(--border)", paddingTop: "0.9rem" }}>
                    {!summary && <p className="muted">Carregando resumo...</p>}
                    {summary && (
                      <>
                        <div className="card-grid" style={{ marginBottom: "0.9rem" }}>
                          <div className="stat-card">
                            <div className="label">Consultas realizadas</div>
                            <div className="value">{summary.completedAppointments}</div>
                          </div>
                          <div className="stat-card">
                            <div className="label">Consultas canceladas</div>
                            <div className="value">{summary.cancelledAppointments}</div>
                          </div>
                          <div className="stat-card">
                            <div className="label">Valores pagos</div>
                            <div className="value">{currency(summary.totalPaid)}</div>
                          </div>
                        </div>
                        <strong>Documentos</strong>
                        {summary.documents.length === 0 && <p className="muted">Nenhum documento emitido.</p>}
                        <ul className="list-plain">
                          {summary.documents.map((d) => (
                            <li key={d.id} className="row-between">
                              <span>
                                {DOCUMENT_KIND_LABEL[d.kind]} — {d.title}
                              </span>
                              <span className="muted">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Layout>
  );
}
