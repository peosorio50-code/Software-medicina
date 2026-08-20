import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

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

const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "status-scheduled",
  CONFIRMED: "status-confirmed",
  CANCELLED: "status-cancelled",
  COMPLETED: "status-completed",
  NO_SHOW: "status-no_show",
};

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Agenda() {
  const { user, logout } = useAuth();
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
    await api.patch(`/appointments/${id}/status`, { status });
    load();
  }

  return (
    <div className="agenda-page">
      <header>
        <div>
          <Logo />
          <span className="eyebrow">Consultório</span>
          <h1>Agenda de hoje</h1>
        </div>
        <div className="user-bar">
          <div className="avatar">{initials(user?.name)}</div>
          <span>{user?.name}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </header>

      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && appointments.length === 0 && (
        <div className="empty-state">
          <strong>Nenhuma consulta hoje</strong>
          Assim que houver agendamentos, eles aparecem aqui.
        </div>
      )}

      <ul className="appointment-list">
        {appointments.map((a) => (
          <li key={a.id} className="appointment-item">
            <div>
              <time>
                {new Date(a.startsAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>{" "}
              — {a.patient.name} (Dr(a). {a.doctor.name})
              <div>
                <span className={`status-pill ${STATUS_CLASS[a.status] ?? ""}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
            </div>
            <div className="actions">
              <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}>
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
    </div>
  );
}
