import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";

interface Patient {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  createdAt: string;
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
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
