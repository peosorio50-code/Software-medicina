import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { Layout } from "../components/Layout";
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
    <Layout>
      <div className="topbar">
        <div>
          <h1>Solicitações</h1>
          <p className="sub">Horários que pacientes levantaram a mão para agendar</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Compartilhar agenda com pacientes</h2>
        </div>
        <div className="panel-body">
          <p style={{ marginBottom: "0.8rem" }}>
            Envie este link para o paciente escolher entre os horários livres.
          </p>
          <div className="share-box">
            <span className="share-link">{shareUrl}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
              {copied ? "Copiado!" : "Copiar link"}
            </button>
            <a
              className="btn btn-primary btn-sm"
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
              className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="loading-state">Carregando...</p>}
        {error && (
          <p className="banner banner-error" style={{ margin: "1rem 1.3rem" }}>
            {error}
          </p>
        )}
        {!loading && !error && requests.length === 0 && (
          <p className="empty-state">Nenhuma solicitação {STATUS_LABEL[tab].toLowerCase()}.</p>
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
                <span className="chip chip-neutral">{STATUS_LABEL[r.status]}</span>
              </div>

              {r.note && <div className="request-note">{r.note}</div>}

              <div className="request-actions">
                {r.patient.phone && (
                  <>
                    <a className="btn btn-secondary btn-sm" href={`tel:${r.patient.phone}`}>
                      Ligar
                    </a>
                    <a
                      className="btn btn-secondary btn-sm"
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
                    <button className="btn btn-primary btn-sm" onClick={() => confirm(r.id)}>
                      Confirmar
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => decline(r.id)}>
                      Recusar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>
    </Layout>
  );
}
