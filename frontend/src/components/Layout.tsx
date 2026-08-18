import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Início" },
  { to: "/agenda", label: "Agenda" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/financeiro", label: "Financeiro" },
  { to: "/documentos", label: "Documentos" },
  { to: "/recibos", label: "Recibos" },
  { to: "/nfse", label: "NFSe" },
  { to: "/configuracoes", label: "Meu Consultório" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-brand">Software Médicina</div>
        <div className="app-nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="app-nav-user">
          <span>{user?.name}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </nav>
      <main className="app-content">{children}</main>
    </div>
  );
}
