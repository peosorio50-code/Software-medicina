import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import type { DoctorUser, Patient } from "../types";

interface Template {
  id: string;
  clinicId: string | null;
  name: string;
  content: string | null;
}

interface Receipt {
  id: string;
  title: string;
  content: string;
  amount: number | null;
  status: "PENDING" | "DONE";
  createdAt: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string };
}

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Receipts() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"afazer" | "concluidos" | "templates">("afazer");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [docs, tpl, pts, drs] = await Promise.all([
        api.get<Receipt[]>("/documents?kind=RECIBO"),
        api.get<Template[]>("/document-templates?kind=RECIBO"),
        api.get<Patient[]>("/patients"),
        api.get<DoctorUser[]>("/users"),
      ]);
      setReceipts(docs);
      setTemplates(tpl);
      setPatients(pts);
      setDoctors(drs.filter((d) => d.role !== "STAFF"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar recibos");
    }
  }

  async function markDone(id: string) {
    await api.patch(`/documents/${id}/status`, { status: "DONE" });
    loadAll();
  }

  async function markPending(id: string) {
    await api.patch(`/documents/${id}/status`, { status: "PENDING" });
    loadAll();
  }

  async function remove(id: string) {
    await api.delete(`/documents/${id}`);
    loadAll();
  }

  const pending = receipts.filter((r) => r.status === "PENDING");
  const done = receipts.filter((r) => r.status === "DONE");

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Recibos</h1>
          <p>Controle de recibos a fazer e concluídos, com templates reutilizáveis.</p>
        </div>
        {tab !== "templates" && (
          <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancelar" : "Novo recibo"}</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="tabs">
        <button className={`tab ${tab === "afazer" ? "active" : ""}`} onClick={() => setTab("afazer")}>
          A fazer ({pending.length})
        </button>
        <button className={`tab ${tab === "concluidos" ? "active" : ""}`} onClick={() => setTab("concluidos")}>
          Concluídos ({done.length})
        </button>
        <button className={`tab ${tab === "templates" ? "active" : ""}`} onClick={() => setTab("templates")}>
          Templates
        </button>
      </div>

      {showForm && tab !== "templates" && (
        <NewReceiptForm
          templates={templates}
          patients={patients}
          doctors={doctors}
          defaultDoctorId={user?.id}
          onSaved={() => {
            setShowForm(false);
            loadAll();
          }}
        />
      )}

      {tab === "afazer" && (
        <ReceiptList receipts={pending} emptyLabel="Nenhum recibo pendente." onAdvance={markDone} advanceLabel="Marcar como concluído" onRemove={remove} />
      )}

      {tab === "concluidos" && (
        <ReceiptList receipts={done} emptyLabel="Nenhum recibo concluído." onAdvance={markPending} advanceLabel="Reabrir" onRemove={remove} />
      )}

      {tab === "templates" && <ReceiptTemplates templates={templates} onChanged={loadAll} />}
    </section>
  );
}

function NewReceiptForm({
  templates,
  patients,
  doctors,
  defaultDoctorId,
  onSaved,
}: {
  templates: Template[];
  patients: Patient[];
  doctors: DoctorUser[];
  defaultDoctorId?: string;
  onSaved: () => void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState(defaultDoctorId ?? "");
  const [title, setTitle] = useState("Recibo de pagamento");
  const [amount, setAmount] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl?.content) setContent(tpl.content);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/documents", {
        templateId: templateId || undefined,
        kind: "RECIBO",
        patientId,
        doctorId,
        title,
        content: content || title,
        amount: amount ? Number(amount) : undefined,
        status: "PENDING",
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar recibo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="form-grid">
        {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        <label>
          Template
          <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">Em branco</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Paciente
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
            <option value="">Selecione</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Médico
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
            <option value="">Selecione</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Valor (R$)
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Conteúdo
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{ fontFamily: "inherit", padding: "0.5rem", borderRadius: 6, border: "1px solid var(--border)" }}
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar recibo"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReceiptList({
  receipts,
  emptyLabel,
  advanceLabel,
  onAdvance,
  onRemove,
}: {
  receipts: Receipt[];
  emptyLabel: string;
  advanceLabel: string;
  onAdvance: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="card">
      {receipts.length === 0 && <p className="muted">{emptyLabel}</p>}
      <ul className="list-plain">
        {receipts.map((r) => (
          <li key={r.id} className="row-between">
            <div>
              <strong>{r.title}</strong> — {r.patient.name}
              <div className="muted">
                Dr(a). {r.doctor.name} · {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                {r.amount != null ? ` · ${currency(r.amount)}` : ""}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => onAdvance(r.id)}>
                {advanceLabel}
              </button>
              <button className="btn-danger" onClick={() => onRemove(r.id)}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReceiptTemplates({ templates, onChanged }: { templates: Template[]; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/document-templates", { kind: "RECIBO", name, content: content || undefined });
      setName("");
      setContent("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/document-templates/${id}`);
    onChanged();
  }

  return (
    <div className="card">
      <h2>Templates de recibo</h2>
      <form onSubmit={add} className="form-grid" style={{ marginBottom: "1.25rem" }}>
        {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        <label>
          Nome do template
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Conteúdo (placeholders: {"{{paciente}}"}, {"{{valor}}"}, {"{{medico}}"}, {"{{data}}"})
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{ fontFamily: "inherit", padding: "0.5rem", borderRadius: 6, border: "1px solid var(--border)" }}
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar template"}
          </button>
        </div>
      </form>

      <ul className="list-plain">
        {templates.length === 0 && <li className="muted">Nenhum template.</li>}
        {templates.map((t) => (
          <li key={t.id} className="row-between">
            <span>
              {t.name} <span className="badge">{t.clinicId ? "personalizado" : "padrão do sistema"}</span>
            </span>
            {t.clinicId && (
              <button className="btn-danger" onClick={() => remove(t.id)}>
                Excluir
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
