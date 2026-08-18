import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

interface SlotRequestLite {
  id: string;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadPending() {
      try {
        const data = await api.get<SlotRequestLite[]>("/requests?status=PENDING");
        if (!cancelled) setPendingCount(data.length);
      } catch {
        // silencioso: contagem é só um indicador, não crítico
      }
    }
    loadPending();
    const interval = setInterval(loadPending, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">+</span>
          <span className="brand-name">Consultório</span>
        </div>

        <nav className="nav-group">
          <span className="nav-label">Agenda</span>
          <NavLink to="/agenda" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            <span className="nav-dot" />
            Consultas
          </NavLink>
          <NavLink
            to="/disponibilidade"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-dot" />
            Disponibilidade
          </NavLink>
          <NavLink
            to="/solicitacoes"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-dot" />
            Solicitações
            {pendingCount > 0 && <span className="badge-count">{pendingCount}</span>}
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          <span className="avatar">{user ? initials(user.name) : "?"}</span>
          <div>
            <div className="who">{user?.name}</div>
            <div className="role">{user?.role === "ADMIN" ? "Administrador" : user?.role === "DOCTOR" ? "Médico(a)" : "Equipe"}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
