import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";

interface RegisterResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string };
  clinic: { id: string; name: string; slug: string };
}

export function Register() {
  const [clinicName, setClinicName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<RegisterResponse>("/auth/register", {
        clinicName,
        name,
        email,
        password,
      });
      login(res.token, res.user, res.clinic);
      navigate("/agenda");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span className="brand-name">Consultório</span>
        </div>
        <h1>Cadastrar clínica</h1>
        <p className="auth-sub">Crie o acesso da sua clínica em menos de um minuto.</p>
        {error && <p className="banner banner-error">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            Nome da clínica
            <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
          </label>
          <label className="field">
            Seu nome
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            Senha (mín. 8 caracteres)
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>
        <p className="auth-foot">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
