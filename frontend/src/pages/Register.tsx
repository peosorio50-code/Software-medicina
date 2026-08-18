import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../components/Brand";

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
      const res = await api.post<{ token: string; user: any }>("/auth/register", {
        clinicName,
        name,
        email,
        password,
      });
      login(res.token, res.user);
      navigate("/agenda");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="login-card">
        <Brand />
        <h1>Cadastrar clínica</h1>
        <p className="login-sub">Crie a clínica e o usuário administrador.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="field">
          <label htmlFor="clinicName">Nome da clínica</label>
          <input id="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="name">Seu nome</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha (mín. 8 caracteres)</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
        <p className="login-foot">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
