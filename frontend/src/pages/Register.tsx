import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

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
      <Logo size="lg" />
      <form onSubmit={handleSubmit} className="auth-form">
        <h1>Cadastrar clínica</h1>
        <p className="subtitle">Crie a conta da clínica e do administrador.</p>
        {error && <p className="error">{error}</p>}
        <label>
          Nome da clínica
          <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
        </label>
        <label>
          Seu nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha (mín. 8 caracteres)
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
        <p>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
