import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { Layout } from "../components/Layout";

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
    await api.patch(`/appointments/${id}/status`, { status });
    load();
  }

  return (
    <Layout>
    <div className="agenda-page">
      <header>
        <h1>Agenda de hoje</h1>
      </header>

      {loading && <p>Carregando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && appointments.length === 0 && <p>Nenhuma consulta hoje.</p>}

      <ul className="appointment-list">
        {appointments.map((a) => (
          <li key={a.id} className="appointment-item">
            <div>
              <strong>
                {new Date(a.startsAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>{" "}
              — {a.patient.name} (Dr(a). {a.doctor.name})
              <div className="status">{STATUS_LABEL[a.status] ?? a.status}</div>
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
    </Layout>
  );
}
