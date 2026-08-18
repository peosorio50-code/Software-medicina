import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Brand } from "./Brand";

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

function NavItem({ to, soon, children }: { to: string; soon?: boolean; children: React.ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
      <span className="nav-dot" />
      {children}
      {soon && <span className="soon">em breve</span>}
    </NavLink>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand size="sm" />
        <nav className="nav-group">
          <span className="nav-label">Consultório</span>
          <NavItem to="/agenda">Agenda</NavItem>
          <NavItem to="/pacientes">Pacientes</NavItem>
          <NavItem to="/prontuario" soon>
            Prontuário
          </NavItem>
          <NavItem to="/financeiro" soon>
            Financeiro
          </NavItem>
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

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
