import { useEffect, useState } from "react";
import { api, ApiError } from "../api";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string };
  notes?: string;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  NO_SHOW: "Faltou",
};

const todayLabel = new Date().toLocaleDateString("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Appointment[]>("/appointments");
      setAppointments(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setAppointments((current) => current.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await api.patch(`/appointments/${id}/status`, { status });
    } catch {
      load();
    }
  }

  const confirmed = appointments.filter((a) => a.status === "CONFIRMED").length;
  const waiting = appointments.filter((a) => a.status === "SCHEDULED").length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;

  return (
    <section>
      <div className="topbar">
        <div>
          <h1>Agenda</h1>
          <div className="sub">Visão do dia</div>
        </div>
        <div className="today-pill">{todayLabel}</div>
      </div>

      <div className="stats">
        <div className="stat-tile">
          <div className="stat-label">Consultas hoje</div>
          <div className="stat-value">{appointments.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Confirmadas</div>
          <div className="stat-value accent">{confirmed}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Aguardando confirmação</div>
          <div className="stat-value">{waiting}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Concluídas</div>
          <div className="stat-value">{completed}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Hoje</h2>
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
        {!loading && !error && appointments.length === 0 && (
          <p className="state-row">Nenhuma consulta hoje.</p>
        )}

        {!loading && !error && appointments.length > 0 && (
          <ul className="agenda-list">
            {appointments.map((a) => (
              <li key={a.id} className="agenda-row">
                <div className="time">
                  {new Date(a.startsAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div>
                  <div className="who-name">{a.patient.name}</div>
                  <div className="who-meta">Dr(a). {a.doctor.name}</div>
                </div>
                <div className="row-status">
                  <span className={`chip chip-static status-${a.status}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                  <select
                    aria-label={`Status da consulta com ${a.patient.name}`}
                    value={a.status}
                    onChange={(e) => updateStatus(a.id, e.target.value)}
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
