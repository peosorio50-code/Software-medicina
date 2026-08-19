import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api";

interface ClinicInfo {
  clinic: { id: string; name: string; slug: string };
  doctors: { id: string; name: string }[];
}

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
}

type Step = "pick" | "contact" | "done";

export function PublicBooking() {
  const { slug = "" } = useParams();
  const [info, setInfo] = useState<ClinicInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<Step>("pick");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedSlots, setConfirmedSlots] = useState<Slot[]>([]);

  useEffect(() => {
    api
      .get<ClinicInfo>(`/public/${slug}`)
      .then((data) => {
        setInfo(data);
        if (data.doctors.length > 0) setDoctorId(data.doctors[0].id);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    if (!doctorId) return;
    setLoadingSlots(true);
    setSelected(new Set());
    api
      .get<Slot[]>(`/public/${slug}/availability?doctorId=${doctorId}`)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [slug, doctorId]);

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

  function toggleSlot(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ slots: Slot[] }>(`/public/${slug}/requests`, {
        doctorId,
        slotIds: [...selected],
        name,
        phone,
        email: email || undefined,
        notes: notes || undefined,
      });
      setConfirmedSlots(res.slots);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao enviar solicitação");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="public-page">
        <div className="public-shell">
          <div className="panel">
            <div className="confirmation-card">
              <h1>Agenda não encontrada</h1>
              <p>Verifique o link enviado pela clínica.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="public-page">
        <div className="public-shell">
          <p className="state-row">
            <span className="spinner" aria-hidden="true" /> Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="public-shell">
        <div className="brand">
          <div className="brand-mark">{info.clinic.name[0]?.toUpperCase() ?? "C"}</div>
          <div className="brand-name">{info.clinic.name}</div>
        </div>

        {step !== "done" && (
          <div className="public-intro">
            <h1>Agendar consulta</h1>
            <p>Escolha um ou mais horários que funcionam para você.</p>
          </div>
        )}

        {step === "pick" && (
          <>
            {info.doctors.length === 0 && (
              <div className="panel">
                <p className="state-row">Nenhum horário disponível no momento.</p>
              </div>
            )}

            {info.doctors.length > 1 && (
              <div className="doctor-picker">
                {info.doctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`doctor-pill${doctorId === d.id ? " active" : ""}`}
                    onClick={() => setDoctorId(d.id)}
                  >
                    Dr(a). {d.name}
                  </button>
                ))}
              </div>
            )}

            {loadingSlots && (
              <p className="state-row">
                <span className="spinner" aria-hidden="true" /> Carregando horários...
              </p>
            )}

            {!loadingSlots && info.doctors.length > 0 && groups.length === 0 && (
              <div className="panel">
                <p className="state-row">Sem horários livres nos próximos dias.</p>
              </div>
            )}

            {!loadingSlots &&
              groups.map(([day, daySlots]) => (
                <div className="panel" key={day} style={{ marginBottom: "1.1rem" }}>
                  <div className="panel-head">
                    <h2 style={{ fontSize: "0.95rem" }}>
                      {new Date(day).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })}
                    </h2>
                  </div>
                  <div className="panel-body">
                    <div className="slot-pick-grid">
                      {daySlots
                        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                        .map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            className={`slot-pick${selected.has(slot.id) ? " selected" : ""}`}
                            onClick={() => toggleSlot(slot.id)}
                          >
                            {new Date(slot.startsAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}

            {selected.size > 0 && (
              <div className="selected-bar">
                <span>
                  {selected.size} horário{selected.size > 1 ? "s" : ""} selecionado{selected.size > 1 ? "s" : ""}
                </span>
                <button type="button" className="btn-new" onClick={() => setStep("contact")}>
                  Continuar
                </button>
              </div>
            )}
          </>
        )}

        {step === "contact" && (
          <div className="panel">
            <div className="panel-head">
              <h2>Seus dados</h2>
            </div>
            <form className="panel-body" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="pb-name">Nome completo</label>
                <input id="pb-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="pb-phone">Telefone (com DDD)</label>
                <input
                  id="pb-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="pb-email">E-mail (opcional)</label>
                <input id="pb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field full">
                <label htmlFor="pb-notes">Observações (opcional)</label>
                <textarea id="pb-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}

              <div className="form-actions" style={{ justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStep("pick")}
                  disabled={submitting}
                >
                  Voltar
                </button>
                <button type="submit" className="btn-new" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar solicitação"}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "done" && (
          <div className="panel">
            <div className="confirmation-card">
              <div className="icon-check">✓</div>
              <h1>Solicitação enviada!</h1>
              <p style={{ marginTop: "0.6rem" }}>
                A clínica vai confirmar um dos horários abaixo e entrar em contato com você.
              </p>
              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {confirmedSlots.map((s) => (
                  <div
                    key={s.id}
                    className="chip chip-static status-CONFIRMED"
                    style={{ justifyContent: "center" }}
                  >
                    {new Date(s.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às{" "}
                    {new Date(s.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
