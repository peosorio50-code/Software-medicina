import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Layout } from "../components/Layout";
import { InvoicesManager } from "../components/InvoicesManager";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import type { DoctorUser } from "../types";

interface Clinic {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  planName: string;
  planStatus: string;
  planRenewsAt: string | null;
  createdAt: string;
}

type Tab = "perfil" | "medicos" | "senha" | "lgpd" | "dados" | "notas" | "plano";

const TABS: { id: Tab; label: string }[] = [
  { id: "perfil", label: "Perfil do consultório" },
  { id: "medicos", label: "Médicos" },
  { id: "senha", label: "Senha" },
  { id: "lgpd", label: "LGPD" },
  { id: "dados", label: "Exportar dados" },
  { id: "notas", label: "Notas fiscais" },
  { id: "plano", label: "Assinatura e plano" },
];

export function Settings() {
  const [tab, setTab] = useState<Tab>("perfil");
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [c, d] = await Promise.all([api.get<Clinic>("/clinic"), api.get<DoctorUser[]>("/users")]);
      setClinic(c);
      setDoctors(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar configurações");
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Meu Consultório</h1>
          <p>Configurações da conta, equipe médica, dados e assinatura.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "perfil" && clinic && <ClinicProfileTab clinic={clinic} onChanged={load} />}
      {tab === "medicos" && <DoctorsTab doctors={doctors} onChanged={load} />}
      {tab === "senha" && <PasswordTab />}
      {tab === "lgpd" && <LgpdTab />}
      {tab === "dados" && <ExportTab />}
      {tab === "notas" && <InvoicesManager />}
      {tab === "plano" && clinic && <PlanTab clinic={clinic} />}
    </Layout>
  );
}

function ClinicProfileTab({ clinic, onChanged }: { clinic: Clinic; onChanged: () => void }) {
  const [name, setName] = useState(clinic.name);
  const [email, setEmail] = useState(clinic.email ?? "");
  const [phone, setPhone] = useState(clinic.phone ?? "");
  const [logoUrl, setLogoUrl] = useState(clinic.logoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put("/clinic", { name, email: email || undefined, phone: phone || undefined, logoUrl: logoUrl || undefined });
      setSuccess(true);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar consultório");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Perfil do consultório</h2>
      <p className="muted">
        Este é o perfil da sua conta: os dados do consultório (não de uma pessoa), exibidos em
        documentos e comunicações.
      </p>
      <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: "1rem" }}>
        {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        {success && <p className="muted" style={{ gridColumn: "1 / -1" }}>Dados salvos com sucesso.</p>}
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1rem", alignItems: "center" }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="logo-preview" />
          ) : (
            <div className="logo-preview" />
          )}
          <label className="stacked-field">
            Logo do consultório
            <input type="file" accept="image/*" onChange={handleLogo} />
          </label>
        </div>
        <label>
          Nome do consultório
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          E-mail do consultório
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Telefone de contato
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DoctorsTab({ doctors, onChanged }: { doctors: DoctorUser[]; onChanged: () => void }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="row-between">
        <h2>Médicos e equipe</h2>
        {user?.role === "ADMIN" && (
          <button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancelar" : "Adicionar médico"}</button>
        )}
      </div>

      {showForm && (
        <NewDoctorForm
          onSaved={() => {
            setShowForm(false);
            onChanged();
          }}
        />
      )}

      <ul className="list-plain" style={{ marginTop: "1rem" }}>
        {doctors.map((d) => (
          <li key={d.id} className="card">
            <div className="doctor-card">
              {d.photoUrl ? <img src={d.photoUrl} alt={d.name} className="avatar" /> : <div className="avatar" />}
              <div style={{ flex: 1 }}>
                <div className="row-between">
                  <strong>{d.name}</strong>
                  <span className="badge">{d.role}</span>
                </div>
                <div className="muted">{d.email}</div>
                <div className="muted">
                  {d.crm ? `CRM ${d.crm}` : "CRM não informado"} ·{" "}
                  {d.specialties || "especialização não informada"}
                </div>
                <div className="muted">{d.cpf ? `CPF ${d.cpf}` : "CPF não informado"}</div>
              </div>
              {(user?.id === d.id || user?.role === "ADMIN") && (
                <button className="btn-secondary" onClick={() => setEditingId(editingId === d.id ? null : d.id)}>
                  {editingId === d.id ? "Fechar" : "Editar"}
                </button>
              )}
            </div>
            {editingId === d.id && (
              <EditDoctorForm
                doctor={d}
                canChangeRole={user?.role === "ADMIN" && user.id !== d.id}
                onSaved={() => {
                  setEditingId(null);
                  onChanged();
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewDoctorForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "DOCTOR" | "STAFF">("DOCTOR");
  const [cpf, setCpf] = useState("");
  const [crm, setCrm] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/users", {
        name,
        email,
        password,
        role,
        cpf: cpf || undefined,
        crm: crm || undefined,
        specialties: specialties || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cadastrar médico");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ margin: "1rem 0" }}>
      {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
      <label>
        Nome completo
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Senha provisória
        <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <label>
        Cargo
        <select value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="DOCTOR">Médico(a)</option>
          <option value="ADMIN">Administrador</option>
          <option value="STAFF">Equipe/Recepção</option>
        </select>
      </label>
      <label>
        CPF
        <input value={cpf} onChange={(e) => setCpf(e.target.value)} />
      </label>
      <label>
        CRM
        <input value={crm} onChange={(e) => setCrm(e.target.value)} />
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        Especializações
        <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Ex: Cardiologia, Clínica Geral" />
      </label>
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Cadastrar médico"}
        </button>
      </div>
    </form>
  );
}

function EditDoctorForm({
  doctor,
  canChangeRole,
  onSaved,
}: {
  doctor: DoctorUser;
  canChangeRole: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState(doctor.name);
  const [photoUrl, setPhotoUrl] = useState(doctor.photoUrl ?? "");
  const [cpf, setCpf] = useState(doctor.cpf ?? "");
  const [crm, setCrm] = useState(doctor.crm ?? "");
  const [specialties, setSpecialties] = useState(doctor.specialties ?? "");
  const [role, setRole] = useState(doctor.role);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`/users/${doctor.id}`, {
        name,
        photoUrl: photoUrl || undefined,
        cpf: cpf || undefined,
        crm: crm || undefined,
        specialties: specialties || undefined,
        ...(canChangeRole ? { role } : {}),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar médico");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1rem", alignItems: "center" }}>
        {photoUrl ? <img src={photoUrl} alt={name} className="avatar" /> : <div className="avatar" />}
        <label className="stacked-field">
          Foto
          <input type="file" accept="image/*" onChange={handlePhoto} />
        </label>
      </div>
      <label>
        Nome completo
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        CPF
        <input value={cpf} onChange={(e) => setCpf(e.target.value)} />
      </label>
      <label>
        CRM
        <input value={crm} onChange={(e) => setCrm(e.target.value)} />
      </label>
      <label>
        Especializações
        <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} />
      </label>
      {canChangeRole && (
        <label>
          Cargo
          <select value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="DOCTOR">Médico(a)</option>
            <option value="ADMIN">Administrador</option>
            <option value="STAFF">Equipe/Recepção</option>
          </select>
        </label>
      )}
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("A confirmação de senha não confere.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/auth/password", { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao alterar senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Alterar senha</h2>
      <form onSubmit={handleSubmit} className="form-grid" style={{ maxWidth: 420 }}>
        {error && <p className="error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        {success && <p className="muted" style={{ gridColumn: "1 / -1" }}>Senha alterada com sucesso.</p>}
        <label>
          Senha atual
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </label>
        <label>
          Nova senha (mín. 8 caracteres)
          <input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <label>
          Confirmar nova senha
          <input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Alterar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LgpdTab() {
  return (
    <div className="card">
      <h2>Privacidade e LGPD</h2>
      <p>
        Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), os dados de
        pacientes, consultas e documentos cadastrados neste consultório são tratados
        exclusivamente para as finalidades de gestão clínica e administrativa do próprio
        consultório.
      </p>
      <ul>
        <li>Os dados de cada clínica são isolados e não são compartilhados entre consultórios.</li>
        <li>Senhas são armazenadas de forma criptografada, nunca em texto plano.</li>
        <li>
          Você pode exportar todos os dados da sua conta a qualquer momento na aba "Exportar
          dados".
        </li>
        <li>
          Pacientes têm direito de solicitar acesso, correção ou exclusão de seus dados pessoais —
          entre em contato com o responsável pelo consultório para exercer esse direito.
        </li>
        <li>
          Mantenha os dados de acesso da equipe protegidos e revogue o acesso de profissionais que
          deixarem o consultório.
        </li>
      </ul>
      <p className="muted">
        Este texto é informativo e não substitui orientação jurídica especializada sobre
        conformidade com a LGPD para o seu consultório.
      </p>
    </div>
  );
}

function ExportTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
      const res = await fetch(`${apiUrl}/clinic/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao exportar dados");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-consultorio-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar dados");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Exportar todos os dados da conta</h2>
      <p className="muted">
        Baixe um arquivo com todos os dados do consultório: perfil, médicos, pacientes, consultas,
        documentos e notas fiscais — útil para portabilidade de dados (LGPD) ou backup.
      </p>
      {error && <p className="error">{error}</p>}
      <button onClick={handleExport} disabled={loading}>
        {loading ? "Gerando arquivo..." : "Exportar dados (.json)"}
      </button>
    </div>
  );
}

function PlanTab({ clinic }: { clinic: Clinic }) {
  return (
    <div className="card">
      <h2>Assinatura e plano</h2>
      <div className="card-grid">
        <div className="stat-card">
          <div className="label">Plano atual</div>
          <div className="value">{clinic.planName}</div>
        </div>
        <div className="stat-card">
          <div className="label">Situação</div>
          <div className="value">
            <span className={`badge ${clinic.planStatus === "active" ? "badge-success" : "badge-warning"}`}>
              {clinic.planStatus === "active" ? "Ativo" : clinic.planStatus}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Próxima renovação</div>
          <div className="value">
            {clinic.planRenewsAt ? new Date(clinic.planRenewsAt).toLocaleDateString("pt-BR") : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Cliente desde</div>
          <div className="value">{new Date(clinic.createdAt).toLocaleDateString("pt-BR")}</div>
        </div>
      </div>
      <p className="muted" style={{ marginTop: "1rem" }}>
        Para alterar de plano ou dados de cobrança, entre em contato com o suporte.
      </p>
    </div>
  );
}
