import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Brand } from "./Brand";
import { RobotIcon } from "./AiIcons";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador(a)",
  DOCTOR: "Médico(a)",
  STAFF: "Equipe",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function NavItem({
  to,
  soon,
  badge,
  ai,
  children,
}: {
  to: string;
  soon?: boolean;
  badge?: number;
  ai?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
      {ai ? (
        <span className="nav-robot" aria-hidden="true">
          <RobotIcon size={14} />
        </span>
      ) : (
        <span className="nav-dot" />
      )}
      {children}
      {soon && <span className="soon">em breve</span>}
      {!!badge && <span className="badge-count">{badge}</span>}
    </NavLink>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "1",
  );

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function loadPending() {
      try {
        const data = await api.get<{ id: string }[]>("/requests?status=PENDING");
        if (!cancelled) setPendingCount(data.length);
      } catch {
        // contagem é só um indicador auxiliar, falha silenciosa
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
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <Brand size="sm" />
        <nav className="nav-group">
          <span className="nav-label">Consultório</span>
          <NavItem to="/dashboard">Início</NavItem>
          <NavItem to="/agenda">Agenda</NavItem>
          <NavItem to="/disponibilidade">Disponibilidade</NavItem>
          <NavItem to="/solicitacoes" badge={pendingCount}>
            Solicitações
          </NavItem>
          <NavItem to="/pacientes">Pacientes</NavItem>
          <NavItem to="/prontuario" soon>
            Prontuário
          </NavItem>
        </nav>
        <nav className="nav-group">
          <span className="nav-label">Gestão</span>
          <NavItem to="/assistente" ai>
            Assistente
          </NavItem>
          <NavItem to="/reativacao" ai>
            Reativação
          </NavItem>
          <NavItem to="/financeiro">Financeiro</NavItem>
          <NavItem to="/documentos">Documentos</NavItem>
          <NavItem to="/recibos">Recibos</NavItem>
          <NavItem to="/nfse">NFSe</NavItem>
          <NavItem to="/configuracoes">Meu Consultório</NavItem>
        </nav>
        <div className="sidebar-foot">
          {user && (
            <div className="who-row">
              <span className="avatar" aria-hidden="true">
                {initials(user.name)}
              </span>
              <div>
                <div className="who">{user.name}</div>
                <div className="role">{ROLE_LABEL[user.role] ?? user.role}</div>
              </div>
            </div>
          )}
          <div className="actions">
            <ThemeToggle />
            <button type="button" className="icon-btn" onClick={logout} aria-label="Sair" title="Sair">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                <path
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="sidebar-handle"
        onClick={toggleSidebar}
        aria-label="Recolher menu"
        title="Recolher/abrir menu"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
          <path
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 6l-6 6 6 6"
          />
        </svg>
      </button>

      <main className="main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
