import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";

interface Doctor {
  id: string;
  name: string;
}

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "OPEN" | "BOOKED" | "CLOSED";
  doctor: { id: string; name: string };
  requests: { id: string }[];
}

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function Disponibilidade() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const today = useMemo(() => new Date(), []);
  const twoWeeksAhead = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 14);
    return d;
  }, [today]);

  const [from, setFrom] = useState(toDateInput(today));
  const [to, setTo] = useState(toDateInput(twoWeeksAhead));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Doctor[]>("/users").then((data) => {
      setDoctors(data);
      if (data.length > 0) setDoctorId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (doctorId) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  async function loadSlots() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Slot[]>(`/availability?doctorId=${doctorId}`);
      setSlots(data.filter((s) => s.status !== "CLOSED"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar disponibilidade");
    } finally {
      setLoading(false);
    }
  }

  function toggleWeekday(value: number) {
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((w) => w !== value) : [...prev, value]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<{ created: number; skipped: number }>("/availability/bulk", {
        doctorId,
        from,
        to,
        weekdays,
        startTime,
        endTime,
        slotMinutes,
      });
      setFeedback(
        `${result.created} horário(s) criado(s)` +
          (result.skipped > 0 ? `, ${result.skipped} ignorado(s) por conflito` : ""),
      );
      loadSlots();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao gerar horários");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSlot(id: string) {
    await api.delete(`/availability/${id}`);
    loadSlots();
  }

  const groups = useMemo(() => {
    const byDay = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = new Date(slot.startsAt).toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(slot);
    }
    return [...byDay.entries()].sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
    );
  }, [slots]);

  return (
    <section>
      <div className="topbar">
        <div>
          <h1>Disponibilidade</h1>
          <div className="sub">Horários livres que os pacientes podem solicitar (AG-09)</div>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {doctors.length > 1 && (
            <select
              aria-label="Médico"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              style={{ width: "auto" }}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn-new" onClick={() => setShowForm((v) => !v)}>
            + Gerar horários
          </button>
        </div>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: "1.25rem" }}>
          <div className="panel-head">
            <h2>Gerar horários</h2>
          </div>
          <form className="panel-body" onSubmit={handleSubmit}>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {feedback && (
              <p className="success" role="status">
                {feedback}
              </p>
            )}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="d-from">De</label>
                <input id="d-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="d-to">Até</label>
                <input id="d-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="d-start">Início</label>
                <input
                  id="d-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="d-end">Fim</label>
                <input id="d-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="d-duration">Duração da consulta</label>
                <select
                  id="d-duration"
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(Number(e.target.value))}
                >
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            </div>

            <div className="field full">
              <label>Dias da semana</label>
              <div className="weekday-picker">
                {WEEKDAYS.map((w) => (
                  <button
                    type="button"
                    key={w.value}
                    className={`weekday-pill${weekdays.includes(w.value) ? " active" : ""}`}
                    onClick={() => toggleWeekday(w.value)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Fechar
              </button>
              <button type="submit" className="btn-new" disabled={submitting || !doctorId}>
                {submitting ? "Gerando..." : "Gerar horários"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Próximos horários</h2>
        </div>
        {loading && (
          <p className="state-row">
            <span className="spinner" aria-hidden="true" /> Carregando...
          </p>
        )}
        {!loading && groups.length === 0 && (
          <p className="state-row">Nenhum horário livre gerado ainda.</p>
        )}
        {!loading &&
          groups.map(([day, daySlots]) => (
            <div className="day-group" key={day}>
              <div className="day-group-head">
                {new Date(day).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </div>
              <div className="slot-chip-row">
                {daySlots
                  .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                  .map((slot) => (
                    <span key={slot.id} className={`slot-chip${slot.status === "BOOKED" ? " booked" : ""}`}>
                      {new Date(slot.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {slot.status === "BOOKED" && " · agendado"}
                      {slot.status === "OPEN" && slot.requests.length > 0 && (
                        <span className="pending-count">{slot.requests.length} interessado(s)</span>
                      )}
                      {slot.status === "OPEN" && (
                        <button type="button" onClick={() => removeSlot(slot.id)} title="Remover horário">
                          ×
                        </button>
                      )}
                    </span>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
