import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { Layout } from "../components/Layout";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patient: { id: string; name: string; phone?: string | null };
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

const STATUS_CHIP: Record<string, string> = {
  SCHEDULED: "chip-sky",
  CONFIRMED: "chip-sage",
  CANCELLED: "chip-rust",
  COMPLETED: "chip-neutral",
  NO_SHOW: "chip-amber",
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function Agenda() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dayLabel = useMemo(
    () =>
      day.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [day],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const from = day.toISOString();
      const to = addDays(day, 1).toISOString();
      const data = await api.get<Appointment[]>(`/appointments?from=${from}&to=${to}`);
      setAppointments(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await api.patch(`/appointments/${id}/status`, { status });
    load();
  }

  const confirmedCount = appointments.filter((a) => a.status === "CONFIRMED").length;
  const pendingCount = appointments.filter((a) => a.status === "SCHEDULED").length;

  return (
    <Layout>
      <div className="topbar">
        <div>
          <h1>Agenda</h1>
          <p className="sub">Consultas do dia selecionado</p>
        </div>
        <div className="day-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => setDay((d) => addDays(d, -1))}>
            ←
          </button>
          <span className="day-label">{dayLabel}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setDay((d) => addDays(d, 1))}>
            →
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setDay(startOfDay(new Date()))}>
            Hoje
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat-tile">
          <div className="stat-label">Consultas no dia</div>
          <div className="stat-value">{appointments.length}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Confirmadas</div>
          <div className="stat-value accent">{confirmedCount}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Aguardando confirmação</div>
          <div className="stat-value">{pendingCount}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Horários</h2>
        </div>

        {loading && <p className="loading-state">Carregando...</p>}
        {error && (
          <p className="banner banner-error" style={{ margin: "1rem 1.3rem" }}>
            {error}
          </p>
        )}
        {!loading && !error && appointments.length === 0 && (
          <p className="empty-state">Nenhuma consulta para este dia.</p>
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
                  <span>
                    {new Date(a.endsAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div>
                  <div className="who-name">{a.patient.name}</div>
                  <div className="who-meta">
                    Dr(a). {a.doctor.name}
                    {a.notes ? ` · ${a.notes}` : ""}
                  </div>
                </div>
                <span className={`chip ${STATUS_CHIP[a.status] ?? "chip-neutral"}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                <select
                  className="status-select"
                  value={a.status}
                  onChange={(e) => updateStatus(a.id, e.target.value)}
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
