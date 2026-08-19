import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import type { DoctorUser, Patient } from "../types";

interface Appointment {
  id: string;
  status: string;
  startsAt: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string };
}

interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  received: number;
  receivable: number;
  cancelled: number;
  patientsAttended: number;
  averageTicket: number;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  NO_SHOW: "Faltou",
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

export function Dashboard() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DoctorUser[]>("/users").then(setDoctors).catch(() => {});
    api.get<Patient[]>("/patients").then(setPatients).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, doctorId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", `${to}T23:59:59`);
      if (doctorId) params.set("doctorId", doctorId);
      const qs = params.toString();

      const [appts, fin] = await Promise.all([
        api.get<Appointment[]>(`/appointments?${qs}`),
        api.get<FinanceSummary>(`/finance/summary?${qs}`),
      ]);
      setAppointments(appts);
      setSummary(fin);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const distinctPatients = new Set(appointments.map((a) => a.patient.id)).size;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Visão geral</h1>
          <p>Panorama do consultório no período selecionado.</p>
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
      {loading && <p>Carregando...</p>}

      {!loading && (
        <>
          <div className="card-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="stat-card">
              <div className="label">Consultas no período</div>
              <div className="value">{appointments.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Pacientes atendidos</div>
              <div className="value">{distinctPatients}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total de pacientes cadastrados</div>
              <div className="value">{patients.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Médicos ativos</div>
              <div className="value">{doctors.filter((d) => d.role !== "STAFF").length}</div>
            </div>
          </div>

          {summary && (
            <div className="card-grid" style={{ marginBottom: "1.25rem" }}>
              <div className="stat-card">
                <div className="label">Entradas</div>
                <div className="value">{currency(summary.totalIncome)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Saídas</div>
                <div className="value">{currency(summary.totalExpense)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Saldo</div>
                <div className="value">{currency(summary.net)}</div>
              </div>
              <div className="stat-card">
                <div className="label">Ticket médio</div>
                <div className="value">{currency(summary.averageTicket)}</div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Consultas por situação</h2>
            {appointments.length === 0 && <p className="muted">Nenhuma consulta no período.</p>}
            {appointments.length > 0 && (
              <ul className="list-plain">
                {Object.entries(STATUS_LABEL).map(([status, label]) =>
                  statusCounts[status] ? (
                    <li key={status} className="row-between">
                      <span>{label}</span>
                      <strong>{statusCounts[status]}</strong>
                    </li>
                  ) : null
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
