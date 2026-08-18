import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";

interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string; role: string };
  clinic: { id: string; name: string; slug: string };
}

export function Login() {
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
      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      login(res.token, res.user, res.clinic);
      navigate("/agenda");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao entrar");
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
        <h1>Entrar</h1>
        <p className="auth-sub">Acesse a agenda da sua clínica.</p>
        {error && <p className="banner banner-error">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="field">
            E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="auth-foot">
          Não tem conta? <Link to="/registrar">Cadastre sua clínica</Link>
        </p>
      </div>
    </div>
  );
}
