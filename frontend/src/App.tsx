import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Agenda } from "./pages/Agenda";
import { Dashboard } from "./pages/Dashboard";
import { Disponibilidade } from "./pages/Disponibilidade";
import { Solicitacoes } from "./pages/Solicitacoes";
import { Patients } from "./pages/Patients";
import { Prontuario } from "./pages/Prontuario";
import { Assistente } from "./pages/Assistente";
import { Reativacao } from "./pages/Reativacao";
import { Finance } from "./pages/Finance";
import { Documents } from "./pages/Documents";
import { Receipts } from "./pages/Receipts";
import { NFSe } from "./pages/NFSe";
import { Settings } from "./pages/Settings";
import { PublicBooking } from "./pages/PublicBooking";
import { AppShell } from "./components/AppShell";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registrar" element={<Register />} />
      <Route path="/agendar/:slug" element={<PublicBooking />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/disponibilidade" element={<Disponibilidade />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
        <Route path="/pacientes" element={<Patients />} />
        <Route path="/prontuario" element={<Prontuario />} />
        <Route path="/assistente" element={<Assistente />} />
        <Route path="/reativacao" element={<Reativacao />} />
        <Route path="/financeiro" element={<Finance />} />
        <Route path="/documentos" element={<Documents />} />
        <Route path="/recibos" element={<Receipts />} />
        <Route path="/nfse" element={<NFSe />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
