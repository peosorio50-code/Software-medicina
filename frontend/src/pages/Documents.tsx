import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Layout } from "../components/Layout";
import { SignaturePad } from "../components/SignaturePad";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import { DOCUMENT_KIND_LABEL } from "../types";
import type { DocumentKind, DoctorUser, Patient } from "../types";

interface Template {
  id: string;
  clinicId: string | null;
  kind: DocumentKind;
  name: string;
  content: string | null;
  fileUrl: string | null;
}

interface Appointment {
  id: string;
  startsAt: string;
  patient: { id: string; name: string };
}

interface PatientDoc {
  id: string;
  kind: DocumentKind;
  title: string;
  content: string;
  createdAt: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string; signatureUrl: string | null; crm: string | null };
  template?: { id: string; name: string } | null;
}

const ISSUABLE_KINDS: DocumentKind[] = ["ATESTADO", "RECEITA", "DIAGNOSTICO", "OUTRO"];

export function Documents() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"emitir" | "templates" | "assinaturas">("emitir");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<PatientDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [tpl, pts, docs, doctorsList] = await Promise.all([
        api.get<Template[]>("/document-templates"),
        api.get<Patient[]>("/patients"),
        api.get<PatientDoc[]>("/documents"),
        api.get<DoctorUser[]>("/users"),
      ]);
      setTemplates(tpl);
      setPatients(pts);
      setDocuments(docs.filter((d) => d.kind !== "RECIBO"));
      setDoctors(doctorsList.filter((d) => d.role !== "STAFF"));
      const wide = await api.get<Appointment[]>(
        "/appointments?from=2000-01-01&to=2100-01-01"
      );
      setAppointments(wide);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar documentos");
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Documentos</h1>
          <p>Atestados, receitas e diagnósticos — a partir de templates ou personalizados.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="tabs">
        <button className={`tab ${tab === "emitir" ? "active" : ""}`} onClick={() => setTab("emitir")}>
          Emitir documento
        </button>
        <button className={`tab ${tab === "templates" ? "active" : ""}`} onClick={() => setTab("templates")}>
          Templates
        </button>
        <button className={`tab ${tab === "assinaturas" ? "active" : ""}`} onClick={() => setTab("assinaturas")}>
          Assinaturas dos médicos
        </button>
      </div>

      {tab === "emitir" && (
        <EmitirTab
          templates={templates}
          patients={patients}
          doctors={doctors}
          appointments={appointments}
          documents={documents}
          defaultDoctorId={user?.id}
          onChanged={loadAll}
        />
      )}

      {tab === "templates" && <TemplatesTab templates={templates} onChanged={loadAll} />}

      {tab === "assinaturas" && <AssinaturasTab doctors={doctors} currentUserId={user?.id} onChanged={loadAll} />}
    </Layout>
  );
}

function fillPlaceholders(content: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value || `{{${key}}}`),
    content
  );
}

function EmitirTab({
  templates,
  patients,
  doctors,
  appointments,
  documents,
  defaultDoctorId,
  onChanged,
}: {
  templates: Template[];
  patients: Patient[];
  doctors: DoctorUser[];
  appointments: Appointment[];
  documents: PatientDoc[];
  defaultDoctorId?: string;
  onChanged: () => void;
}) {
  const [kind, setKind] = useState<DocumentKind>("ATESTADO");
  const [templateId, setTemplateId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [doctorId, setDoctorId] = useState(defaultDoctorId ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kindTemplates = templates.filter((t) => t.kind === kind);
  const patientAppointments = appointments.filter((a) => a.patient.id === patientId);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setTitle(tpl.name);
    if (tpl.content) {
      const patient = patients.find((p) => p.id === patientId);
      const doctor = doctors.find((d) => d.id === doctorId);
      setContent(
        fillPlaceholders(tpl.content, {
          paciente: patient?.name ?? "",
          medico: doctor?.name ?? "",
          crm: doctor?.crm ?? "",
          data: new Date().toLocaleDateString("pt-BR"),
        })
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/documents", {
        templateId: templateId || undefined,
        kind,
        patientId,
        appointmentId: appointmentId || undefined,
        doctorId,
        title,
        content,
      });
      setTitle("");
      setContent("");
      setTemplateId("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao emitir documento");
    } finally {
      setSaving(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  return (
    <>
      <div className="card">
        <h2>Novo documento</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
          <label>
            Tipo de documento
            <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
              {ISSUABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {DOCUMENT_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Template
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">Em branco</option>
              {kindTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.clinicId ? " (personalizado)" : " (padrão)"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Paciente
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="">Selecione</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Consulta (opcional)
            <select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}>
              <option value="">Nenhuma</option>
              {patientAppointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {new Date(a.startsAt).toLocaleString("pt-BR")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Médico responsável
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
              <option value="">Selecione</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Conteúdo
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
              style={{ fontFamily: "inherit", padding: "0.5rem", borderRadius: 6, border: "1px solid var(--border)" }}
            />
          </label>
          {selectedDoctor?.signatureUrl && (
            <div style={{ gridColumn: "1 / -1" }}>
              <span className="muted">Assinatura de {selectedDoctor.name}:</span>
              <br />
              <img src={selectedDoctor.signatureUrl} alt="Assinatura" className="signature-preview" />
            </div>
          )}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Emitindo..." : "Emitir documento"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Documentos emitidos</h2>
        {documents.length === 0 && <p className="muted">Nenhum documento emitido ainda.</p>}
        <ul className="list-plain">
          {documents.map((d) => (
            <li key={d.id} className="row-between">
              <div>
                <strong>{DOCUMENT_KIND_LABEL[d.kind]}</strong> — {d.title} · {d.patient.name}
                <div className="muted">
                  Dr(a). {d.doctor.name} · {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function TemplatesTab({ templates, onChanged }: { templates: Template[]; onChanged: () => void }) {
  const [kind, setKind] = useState<DocumentKind>("ATESTADO");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedFile(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/document-templates", {
        kind,
        name,
        content: content || undefined,
        fileUrl: uploadedFile || undefined,
      });
      setName("");
      setContent("");
      setUploadedFile(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/document-templates/${id}`);
    onChanged();
  }

  return (
    <div className="card">
      <h2>Templates de documentos</h2>
      <p className="muted">
        O software já vem com um template padrão para cada tipo de documento. Você pode criar
        modelos personalizados escrevendo o conteúdo ou enviando o seu próprio arquivo.
      </p>

      <form onSubmit={add} className="form-grid" style={{ margin: "1rem 0 1.25rem" }}>
        {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        <label>
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            {(["ATESTADO", "RECEITA", "DIAGNOSTICO", "RECIBO", "OUTRO"] as DocumentKind[]).map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nome do template
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Conteúdo do template (use placeholders como {"{{paciente}}"}, {"{{medico}}"}, {"{{data}}"})
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            style={{ fontFamily: "inherit", padding: "0.5rem", borderRadius: 6, border: "1px solid var(--border)" }}
          />
        </label>
        <label>
          Ou envie seu próprio arquivo de modelo
          <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFile} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar template"}
          </button>
        </div>
      </form>

      {ISSUABLE_KINDS.concat("RECIBO").map((k) => {
        const list = templates.filter((t) => t.kind === k);
        if (list.length === 0) return null;
        return (
          <div key={k} style={{ marginBottom: "1rem" }}>
            <strong>{DOCUMENT_KIND_LABEL[k]}</strong>
            <ul className="list-plain" style={{ marginTop: "0.4rem" }}>
              {list.map((t) => (
                <li key={t.id} className="row-between">
                  <span>
                    {t.name} <span className="badge">{t.clinicId ? "personalizado" : "padrão do sistema"}</span>
                  </span>
                  {t.clinicId && (
                    <button className="btn-danger" onClick={() => remove(t.id)}>
                      Excluir
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AssinaturasTab({
  doctors,
  currentUserId,
  onChanged,
}: {
  doctors: DoctorUser[];
  currentUserId?: string;
  onChanged: () => void;
}) {
  const [activeDoctorId, setActiveDoctorId] = useState(currentUserId ?? doctors[0]?.id ?? "");

  async function save(doctorId: string, dataUrl: string) {
    await api.put(`/users/${doctorId}`, { signatureUrl: dataUrl });
    onChanged();
  }

  async function removeSignature(doctorId: string) {
    await api.put(`/users/${doctorId}`, { signatureUrl: "" });
    onChanged();
  }

  return (
    <div className="card">
      <h2>Assinaturas virtuais</h2>
      <p className="muted">
        Capture a assinatura de cada médico uma vez para usá-la automaticamente ao emitir
        documentos.
      </p>

      <label className="stacked-field" style={{ maxWidth: 300, marginBottom: "1rem" }}>
        Médico
        <select value={activeDoctorId} onChange={(e) => setActiveDoctorId(e.target.value)}>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      {activeDoctorId && (
        <div>
          {doctors.find((d) => d.id === activeDoctorId)?.signatureUrl ? (
            <div>
              <img
                src={doctors.find((d) => d.id === activeDoctorId)?.signatureUrl ?? ""}
                alt="Assinatura salva"
                className="signature-preview"
              />
              <div className="form-actions">
                <button className="btn-danger" onClick={() => removeSignature(activeDoctorId)}>
                  Remover assinatura
                </button>
              </div>
            </div>
          ) : (
            <SignaturePad onSave={(dataUrl) => save(activeDoctorId, dataUrl)} />
          )}
        </div>
      )}
    </div>
  );
}
