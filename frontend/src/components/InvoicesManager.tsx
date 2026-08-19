import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import type { Patient } from "../types";

type InvoiceStatus = "PENDING" | "ISSUED" | "CANCELLED";

interface Invoice {
  id: string;
  number: string;
  description: string | null;
  amount: number;
  status: InvoiceStatus;
  issueDate: string;
  patient?: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: "A emitir",
  ISSUED: "Emitida",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  PENDING: "badge-warning",
  ISSUED: "badge-success",
  CANCELLED: "badge-danger",
};

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function InvoicesManager({ title = "Notas fiscais (NFSe)" }: { title?: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [number, setNumber] = useState("");
  const [patientId, setPatientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    api.get<Patient[]>("/patients").then(setPatients).catch(() => {});
  }, []);

  async function load() {
    try {
      setInvoices(await api.get<Invoice[]>("/invoices"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar notas fiscais");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/invoices", {
        number,
        patientId: patientId || undefined,
        description: description || undefined,
        amount: Number(amount),
        issueDate,
      });
      setNumber("");
      setDescription("");
      setAmount("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar nota fiscal");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: InvoiceStatus) {
    await api.patch(`/invoices/${id}/status`, { status });
    load();
  }

  async function remove(id: string) {
    await api.delete(`/invoices/${id}`);
    load();
  }

  return (
    <div className="card">
      <div className="row-between">
        <h2>{title}</h2>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancelar" : "Nova nota fiscal"}</button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="form-grid" style={{ margin: "1rem 0" }}>
          <label>
            Número
            <input value={number} onChange={(e) => setNumber(e.target.value)} required />
          </label>
          <label>
            Paciente (opcional)
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Nenhum</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data de emissão
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          </label>
          <label>
            Valor (R$)
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Descrição do serviço
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {invoices.length === 0 && <p className="muted">Nenhuma nota fiscal cadastrada.</p>}

      {invoices.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Data</th>
                <th>Paciente</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.number}</td>
                  <td>{new Date(inv.issueDate).toLocaleDateString("pt-BR")}</td>
                  <td>{inv.patient?.name ?? "—"}</td>
                  <td>{inv.description ?? "—"}</td>
                  <td>{currency(inv.amount)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                  </td>
                  <td>
                    <div className="form-actions">
                      {inv.status !== "ISSUED" && (
                        <button className="btn-secondary" onClick={() => updateStatus(inv.id, "ISSUED")}>
                          Emitir
                        </button>
                      )}
                      {inv.status !== "CANCELLED" && (
                        <button className="btn-secondary" onClick={() => updateStatus(inv.id, "CANCELLED")}>
                          Cancelar
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => remove(inv.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
