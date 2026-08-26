import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import type { DoctorUser, Patient } from "../types";
import { AiInsightPanel } from "../components/AiInsightPanel";

type TxType = "INCOME" | "EXPENSE";
type TxStatus = "PENDING" | "COMPLETED" | "CANCELLED";
type Period = "WEEKLY" | "MONTHLY" | "YEARLY";

interface Category {
  id: string;
  type: TxType;
  name: string;
}

interface Transaction {
  id: string;
  type: TxType;
  status: TxStatus;
  description: string;
  amount: number;
  date: string;
  category?: { id: string; name: string } | null;
  patient?: { id: string; name: string } | null;
  doctor?: { id: string; name: string } | null;
}

interface Recurrence {
  id: string;
  type: TxType;
  description: string;
  amount: number;
  period: Period;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  category?: { id: string; name: string } | null;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  received: number;
  receivable: number;
  cancelled: number;
  patientsAttended: number;
  averageTicket: number;
}

const STATUS_LABEL: Record<TxStatus, string> = {
  PENDING: "A receber/pagar",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado/Adiado",
};

const PERIOD_LABEL: Record<Period, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface FinanceSummaryResponse {
  summary: string;
  interactionId: string;
}

export function Finance() {
  const [tab, setTab] = useState<"movimentacoes" | "categorias" | "recorrencias">("movimentacoes");
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTxForm, setShowTxForm] = useState(false);

  useEffect(() => {
    api.get<DoctorUser[]>("/users").then(setDoctors).catch(() => {});
    api.get<Patient[]>("/patients").then(setPatients).catch(() => {});
  }, []);

  useEffect(() => {
    loadCategories();
    loadRecurrences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTransactionsAndSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, doctorId]);

  function queryString() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", `${to}T23:59:59`);
    if (doctorId) params.set("doctorId", doctorId);
    return params.toString();
  }

  async function loadTransactionsAndSummary() {
    setLoading(true);
    setError(null);
    try {
      const qs = queryString();
      const [tx, sum] = await Promise.all([
        api.get<Transaction[]>(`/finance/transactions?${qs}`),
        api.get<Summary>(`/finance/summary?${qs}`),
      ]);
      setTransactions(tx);
      setSummary(sum);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      setCategories(await api.get<Category[]>("/finance/categories"));
    } catch {
      // ignora
    }
  }

  async function loadRecurrences() {
    try {
      setRecurrences(await api.get<Recurrence[]>("/finance/recurrences"));
    } catch {
      // ignora
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Financeiro</h1>
          <p>Movimentações, categorias e lançamentos recorrentes do consultório.</p>
        </div>
      </div>

      <div className="filters-bar">
        <label className="stacked-field">
          De
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="stacked-field">
          Até
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="stacked-field">
          Médico
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Todos</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <AiInsightPanel
        title="Resumo do período"
        description="Uma leitura curta do resultado do período selecionado, destacando o que mais pesa no caixa."
        buttonLabel="Gerar resumo"
        loadingLabel="Analisando os números do período..."
        feedbackLabel="Esse resumo ficou:"
        onGenerate={async () => {
          const data = await api.post<FinanceSummaryResponse>("/ai/finance/summary", {
            from,
            to: `${to}T23:59:59`,
          });
          return { text: data.summary, interactionId: data.interactionId };
        }}
      />

      <div className="tabs">
        <button className={`tab ${tab === "movimentacoes" ? "active" : ""}`} onClick={() => setTab("movimentacoes")}>
          Movimentações
        </button>
        <button className={`tab ${tab === "categorias" ? "active" : ""}`} onClick={() => setTab("categorias")}>
          Categorias
        </button>
        <button className={`tab ${tab === "recorrencias" ? "active" : ""}`} onClick={() => setTab("recorrencias")}>
          Recorrências
        </button>
      </div>

      {tab === "movimentacoes" && (
        <MovimentacoesTab
          loading={loading}
          summary={summary}
          transactions={transactions}
          categories={categories}
          patients={patients}
          doctors={doctors}
          showTxForm={showTxForm}
          setShowTxForm={setShowTxForm}
          onChanged={loadTransactionsAndSummary}
        />
      )}

      {tab === "categorias" && <CategoriasTab categories={categories} onChanged={loadCategories} />}

      {tab === "recorrencias" && (
        <RecorrenciasTab
          recurrences={recurrences}
          categories={categories}
          onChanged={() => {
            loadRecurrences();
            loadTransactionsAndSummary();
          }}
        />
      )}
    </section>
  );
}

function MovimentacoesTab({
  loading,
  summary,
  transactions,
  categories,
  patients,
  doctors,
  showTxForm,
  setShowTxForm,
  onChanged,
}: {
  loading: boolean;
  summary: Summary | null;
  transactions: Transaction[];
  categories: Category[];
  patients: Patient[];
  doctors: DoctorUser[];
  showTxForm: boolean;
  setShowTxForm: (v: boolean) => void;
  onChanged: () => void;
}) {
  const [type, setType] = useState<TxType>("INCOME");
  const [status, setStatus] = useState<TxStatus>("COMPLETED");
  const [categoryId, setCategoryId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/finance/transactions", {
        type,
        status,
        categoryId: categoryId || undefined,
        patientId: patientId || undefined,
        doctorId: doctorId || undefined,
        description,
        amount: Number(amount),
        date,
      });
      setDescription("");
      setAmount("");
      setShowTxForm(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao adicionar transação");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, newStatus: TxStatus) {
    await api.patch(`/finance/transactions/${id}/status`, { status: newStatus });
    onChanged();
  }

  async function remove(id: string) {
    await api.delete(`/finance/transactions/${id}`);
    onChanged();
  }

  return (
    <>
      {summary && (
        <div className="card-grid" style={{ marginBottom: "1.25rem" }}>
          <div className="stat-card">
            <div className="label">Entradas no período</div>
            <div className="value">{currency(summary.totalIncome)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Saídas no período</div>
            <div className="value">{currency(summary.totalExpense)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Saldo</div>
            <div className="value">{currency(summary.net)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Recebido</div>
            <div className="value">{currency(summary.received)}</div>
          </div>
          <div className="stat-card">
            <div className="label">A receber</div>
            <div className="value">{currency(summary.receivable)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Cancelado/adiado</div>
            <div className="value">{currency(summary.cancelled)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Pacientes atendidos</div>
            <div className="value">{summary.patientsAttended}</div>
          </div>
          <div className="stat-card">
            <div className="label">Ticket médio</div>
            <div className="value">{currency(summary.averageTicket)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row-between">
          <h2>Movimentações</h2>
          <button onClick={() => setShowTxForm(!showTxForm)}>
            {showTxForm ? "Cancelar" : "Adicionar transação"}
          </button>
        </div>

        {showTxForm && (
          <form onSubmit={handleSubmit} className="form-grid" style={{ marginBottom: "1rem" }}>
            {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
            <label>
              Tipo
              <select value={type} onChange={(e) => setType(e.target.value as TxType)}>
                <option value="INCOME">Entrada</option>
                <option value="EXPENSE">Saída</option>
              </select>
            </label>
            <label>
              Situação
              <select value={status} onChange={(e) => setStatus(e.target.value as TxStatus)}>
                <option value="COMPLETED">Concluído</option>
                <option value="PENDING">A receber/pagar</option>
                <option value="CANCELLED">Cancelado/adiado</option>
              </select>
            </label>
            <label>
              Categoria
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.filter((c) => c.type === type).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Paciente
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
              Médico
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">Nenhum</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Descrição
              <input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </label>
            <label>
              Valor (R$)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar transação"}
              </button>
            </div>
          </form>
        )}

        {loading && <p>Carregando...</p>}
        {!loading && transactions.length === 0 && <p className="muted">Nenhuma movimentação no período.</p>}

        {!loading && transactions.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString("pt-BR")}</td>
                    <td>{t.type === "INCOME" ? "Entrada" : "Saída"}</td>
                    <td>{t.description}</td>
                    <td>{t.category?.name ?? "—"}</td>
                    <td>{t.patient?.name ?? "—"}</td>
                    <td>{t.doctor?.name ?? "—"}</td>
                    <td>{currency(t.amount)}</td>
                    <td>
                      <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value as TxStatus)}>
                        {Object.entries(STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className="btn-danger" onClick={() => remove(t.id)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function CategoriasTab({ categories, onChanged }: { categories: Category[]; onChanged: () => void }) {
  const [type, setType] = useState<TxType>("INCOME");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/finance/categories", { type, name });
      setName("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao adicionar categoria");
    }
  }

  async function remove(id: string) {
    await api.delete(`/finance/categories/${id}`);
    onChanged();
  }

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="card">
      <h2>Categorias de receitas e despesas</h2>
      <form onSubmit={add} className="form-grid" style={{ marginBottom: "1.25rem" }}>
        {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        <label>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as TxType)}>
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
        </label>
        <label>
          Nome da categoria
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <div className="form-actions">
          <button type="submit">Adicionar categoria</button>
        </div>
      </form>

      <div className="card-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <strong>Receitas</strong>
          <ul className="list-plain" style={{ marginTop: "0.5rem" }}>
            {income.length === 0 && <li className="muted">Nenhuma categoria.</li>}
            {income.map((c) => (
              <li key={c.id} className="row-between">
                {c.name}
                <button className="btn-danger" onClick={() => remove(c.id)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Despesas</strong>
          <ul className="list-plain" style={{ marginTop: "0.5rem" }}>
            {expense.length === 0 && <li className="muted">Nenhuma categoria.</li>}
            {expense.map((c) => (
              <li key={c.id} className="row-between">
                {c.name}
                <button className="btn-danger" onClick={() => remove(c.id)}>
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RecorrenciasTab({
  recurrences,
  categories,
  onChanged,
}: {
  recurrences: Recurrence[];
  categories: Category[];
  onChanged: () => void;
}) {
  const [type, setType] = useState<TxType>("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<Period>("MONTHLY");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/finance/recurrences", {
        type,
        categoryId: categoryId || undefined,
        description,
        amount: Number(amount),
        period,
        startDate,
        endDate: endDate || undefined,
      });
      setDescription("");
      setAmount("");
      setEndDate("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao adicionar recorrência");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: Recurrence) {
    await api.put(`/finance/recurrences/${r.id}`, { active: !r.active });
    onChanged();
  }

  async function remove(id: string) {
    await api.delete(`/finance/recurrences/${id}`);
    onChanged();
  }

  return (
    <div className="card">
      <h2>Lançamentos recorrentes</h2>
      <p className="muted">
        Valores periódicos fixos de entrada ou saída (ex.: aluguel, mensalidade de sistema). São
        lançados automaticamente como transações a partir da data de início.
      </p>

      <form onSubmit={add} className="form-grid" style={{ margin: "1rem 0 1.25rem" }}>
        {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        <label>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as TxType)}>
            <option value="INCOME">Entrada</option>
            <option value="EXPENSE">Saída</option>
          </select>
        </label>
        <label>
          Categoria
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.type === type).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Descrição
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <label>
          Valor (R$)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Período
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {Object.entries(PERIOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data de início
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </label>
        <label>
          Data final (opcional)
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar recorrência"}
          </button>
        </div>
      </form>

      <ul className="list-plain">
        {recurrences.length === 0 && <li className="muted">Nenhuma recorrência cadastrada.</li>}
        {recurrences.map((r) => (
          <li key={r.id} className="row-between">
            <div>
              <strong>{r.description}</strong>{" "}
              <span className={`badge ${r.type === "INCOME" ? "badge-success" : "badge-danger"}`}>
                {r.type === "INCOME" ? "Entrada" : "Saída"}
              </span>{" "}
              <span className="muted">
                {currency(r.amount)} · {PERIOD_LABEL[r.period]} · desde{" "}
                {new Date(r.startDate).toLocaleDateString("pt-BR")}
                {r.endDate ? ` até ${new Date(r.endDate).toLocaleDateString("pt-BR")}` : ""}
              </span>
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => toggleActive(r)}>
                {r.active ? "Pausar" : "Reativar"}
              </button>
              <button className="btn-danger" onClick={() => remove(r.id)}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
