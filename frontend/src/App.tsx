import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Agenda } from "./pages/Agenda";
import { Dashboard } from "./pages/Dashboard";
import { Patients } from "./pages/Patients";
import { Finance } from "./pages/Finance";
import { Documents } from "./pages/Documents";
import { Receipts } from "./pages/Receipts";
import { NFSe } from "./pages/NFSe";
import { Settings } from "./pages/Settings";

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
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/agenda"
        element={
          <RequireAuth>
            <Agenda />
          </RequireAuth>
        }
      />
      <Route
        path="/pacientes"
        element={
          <RequireAuth>
            <Patients />
          </RequireAuth>
        }
      />
      <Route
        path="/financeiro"
        element={
          <RequireAuth>
            <Finance />
          </RequireAuth>
        }
      />
      <Route
        path="/documentos"
        element={
          <RequireAuth>
            <Documents />
          </RequireAuth>
        }
      />
      <Route
        path="/recibos"
        element={
          <RequireAuth>
            <Receipts />
          </RequireAuth>
        }
      />
      <Route
        path="/nfse"
        element={
          <RequireAuth>
            <NFSe />
          </RequireAuth>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        }
      />
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
