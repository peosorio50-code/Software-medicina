import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";

interface SlotRequestData {
  id: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED";
  note: string | null;
  createdAt: string;
  patient: { id: string; name: string; phone: string | null; email: string | null };
  slot: {
    startsAt: string;
    endsAt: string;
    doctor: { id: string; name: string };
  };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  CONFIRMED: "Confirmada",
  DECLINED: "Recusada",
  CANCELLED: "Cancelada",
};

const STATUS_CHIP: Record<string, string> = {
  PENDING: "status-SCHEDULED",
  CONFIRMED: "status-CONFIRMED",
  DECLINED: "status-CANCELLED",
  CANCELLED: "status-NO_SHOW",
};

const TABS: { key: SlotRequestData["status"]; label: string }[] = [
  { key: "PENDING", label: "Pendentes" },
  { key: "CONFIRMED", label: "Confirmadas" },
  { key: "DECLINED", label: "Recusadas" },
];

function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

function formatSlot(slot: SlotRequestData["slot"]) {
  const start = new Date(slot.startsAt);
  const date = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const time = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

export function Solicitacoes() {
  const { clinic } = useAuth();
  const [tab, setTab] = useState<SlotRequestData["status"]>("PENDING");
  const [requests, setRequests] = useState<SlotRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = clinic ? `${window.location.origin}/agendar/${clinic.slug}` : "";

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SlotRequestData[]>(`/requests?status=${tab}`);
      setRequests(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(id: string) {
    try {
      await api.patch(`/requests/${id}/confirm`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao confirmar");
    }
  }

  async function decline(id: string) {
    try {
      await api.patch(`/requests/${id}/decline`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao recusar");
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section>
      <div className="topbar">
        <div>
          <h1>Solicitações</h1>
          <div className="sub">Horários que pacientes levantaram a mão para agendar (AG-09)</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1.25rem" }}>
        <div className="panel-head">
          <h2>Compartilhar agenda com pacientes</h2>
        </div>
        <div className="panel-body">
          <p style={{ marginBottom: "0.8rem", color: "var(--ink-soft)" }}>
            Envie este link para o paciente escolher entre os horários livres.
          </p>
          <div className="share-box">
            <span className="share-link">{shareUrl}</span>
            <button type="button" className="btn-secondary" onClick={copyLink}>
              {copied ? "Copiado!" : "Copiar link"}
            </button>
            <a
              className="btn-new"
              href={`https://wa.me/?text=${encodeURIComponent(`Agende sua consulta pelo link: ${shareUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head" style={{ gap: "0.4rem" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? "btn-new" : "btn-secondary"}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
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
        {!loading && !error && requests.length === 0 && (
          <p className="state-row">Nenhuma solicitação {STATUS_LABEL[tab].toLowerCase()}.</p>
        )}

        {!loading &&
          !error &&
          requests.map((r) => (
            <div className="request-card" key={r.id}>
              <div className="request-top">
                <div>
                  <div className="who-name">{r.patient.name}</div>
                  <div className="who-meta">
                    Dr(a). {r.slot.doctor.name} · {formatSlot(r.slot)}
                  </div>
                </div>
                <span className={`chip chip-static ${STATUS_CHIP[r.status]}`}>{STATUS_LABEL[r.status]}</span>
              </div>

              {r.note && <div className="request-note">{r.note}</div>}

              <div className="request-actions">
                {r.patient.phone && (
                  <>
                    <a className="btn-secondary" href={`tel:${r.patient.phone}`}>
                      Ligar
                    </a>
                    <a
                      className="btn-secondary"
                      href={`https://wa.me/${whatsappDigits(r.patient.phone)}?text=${encodeURIComponent(
                        r.status === "CONFIRMED"
                          ? `Olá, ${r.patient.name}! Sua consulta com Dr(a). ${r.slot.doctor.name} está confirmada para ${formatSlot(r.slot)}.`
                          : `Olá, ${r.patient.name}! Sobre seu pedido de horário para ${formatSlot(r.slot)} com Dr(a). ${r.slot.doctor.name}...`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </>
                )}
                {r.status === "PENDING" && (
                  <>
                    <button type="button" className="btn-new" onClick={() => confirm(r.id)}>
                      Confirmar
                    </button>
                    <button type="button" className="btn-danger" onClick={() => decline(r.id)}>
                      Recusar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
