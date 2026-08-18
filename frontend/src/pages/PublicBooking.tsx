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
          <p className="loading-state">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="public-shell">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span className="brand-name">{info.clinic.name}</span>
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
                <p className="empty-state">Nenhum horário disponível no momento.</p>
              </div>
            )}

            {info.doctors.length > 1 && (
              <div className="doctor-picker">
                {info.doctors.map((d) => (
                  <button
                    key={d.id}
                    className={`doctor-pill${doctorId === d.id ? " active" : ""}`}
                    onClick={() => setDoctorId(d.id)}
                  >
                    Dr(a). {d.name}
                  </button>
                ))}
              </div>
            )}

            {loadingSlots && <p className="loading-state">Carregando horários...</p>}

            {!loadingSlots && info.doctors.length > 0 && groups.length === 0 && (
              <div className="panel">
                <p className="empty-state">Sem horários livres nos próximos dias.</p>
              </div>
            )}

            {!loadingSlots &&
              groups.map(([day, daySlots]) => (
                <div className="panel" key={day}>
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
                <button className="btn btn-primary" onClick={() => setStep("contact")}>
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
            <div className="panel-body">
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <label className="field">
                  Nome completo
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label className="field">
                  Telefone (com DDD)
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </label>
                <label className="field">
                  E-mail (opcional)
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="field">
                  Observações (opcional)
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>

                {error && <p className="banner banner-error">{error}</p>}

                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStep("pick")}
                    disabled={submitting}
                  >
                    Voltar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Enviando..." : "Enviar solicitação"}
                  </button>
                </div>
              </form>
            </div>
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
                  <div key={s.id} className="chip chip-sage" style={{ justifyContent: "center" }}>
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
