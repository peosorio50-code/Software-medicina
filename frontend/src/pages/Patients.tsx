import { Fragment, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import { DOCUMENT_KIND_LABEL } from "../types";
import type { DocumentKind } from "../types";

interface Patient {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface PatientSummary {
  patient: Patient;
  completedAppointments: number;
  cancelledAppointments: number;
  totalPaid: number;
  documents: { id: string; kind: DocumentKind; title: string; status: string; createdAt: string }[];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyForm = { name: "", phone: "", email: "", birthDate: "", notes: "" };

export function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, PatientSummary>>({});

  useEffect(() => {
    const timeout = setTimeout(() => load(search), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  async function load(query: string) {
    setLoading(true);
    setError(null);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : "";
      const data = await api.get<Patient[]>(`/patients${params}`);
      setPatients(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await api.post("/patients", {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        birthDate: form.birthDate || undefined,
        notes: form.notes || undefined,
      });
      setForm(emptyForm);
      setShowForm(false);
      load(search);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao cadastrar paciente");
    } finally {
      setSaving(false);
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

  return (
    <section>
      <div className="topbar">
        <div>
          <h1>Pacientes</h1>
          <div className="sub">
            {patients.length} paciente{patients.length === 1 ? "" : "s"} cadastrado
            {patients.length === 1 ? "" : "s"}
          </div>
        </div>
        <button type="button" className="btn-new" onClick={() => setShowForm((v) => !v)}>
          + Novo paciente
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: "1.25rem" }}>
          <div className="panel-head">
            <h2>Novo paciente</h2>
          </div>
          <form className="panel-body" onSubmit={handleCreate}>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="p-name">Nome</label>
                <input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                />
              </div>
              <div className="field">
                <label htmlFor="p-phone">Telefone</label>
                <input
                  id="p-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="p-email">E-mail</label>
                <input
                  id="p-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="p-birth">Data de nascimento</label>
                <input
                  id="p-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              <div className="field full">
                <label htmlFor="p-notes">Observações</label>
                <textarea
                  id="p-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-new" disabled={saving}>
                {saving ? "Salvando..." : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Todos os pacientes</h2>
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar paciente por nome"
            />
          </div>
        </div>

        {loading && (
          <p className="state-row">
            <span className="spinner" aria-hidden="true" /> Carregando...
          </p>
        )}
        {error && (
          <p className="error" role="alert" style={{ margin: "1rem 1.3rem" }}>
            {error}
          </p>
        )}
        {!loading && !error && patients.length === 0 && (
          <p className="state-row">Nenhum paciente encontrado.</p>
        )}

        {!loading && !error && patients.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Contato</th>
                  <th>Nascimento</th>
                  <th>Cadastrado em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const isOpen = expandedId === p.id;
                  const summary = summaries[p.id];
                  return (
                    <Fragment key={p.id}>
                      <tr
                        onClick={() => toggleExpand(p.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                            <span className="avatar" style={{ width: 30, height: 30, fontSize: "0.72rem" }} aria-hidden="true">
                              {initials(p.name)}
                            </span>
                            <span className="patient-name">{p.name}</span>
                          </div>
                        </td>
                        <td>
                          <div>{p.phone || "—"}</div>
                          {p.email && <div className="patient-sub">{p.email}</div>}
                        </td>
                        <td className="mono">{formatDate(p.birthDate)}</td>
                        <td className="mono">{formatDate(p.createdAt)}</td>
                        <td className="mono" aria-hidden="true">
                          {isOpen ? "▲" : "▼"}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} style={{ background: "var(--surface-alt)" }}>
                            {!summary && <p className="muted">Carregando resumo...</p>}
                            {summary && (
                              <div style={{ padding: "0.5rem 0" }}>
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
                                {summary.documents.length === 0 && (
                                  <p className="muted">Nenhum documento emitido.</p>
                                )}
                                <ul className="list-plain">
                                  {summary.documents.map((d) => (
                                    <li key={d.id} className="row-between">
                                      <span>
                                        {DOCUMENT_KIND_LABEL[d.kind]} — {d.title}
                                      </span>
                                      <span className="muted">
                                        {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
