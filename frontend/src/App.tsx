import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Agenda } from "./pages/Agenda";
import { Disponibilidade } from "./pages/Disponibilidade";
import { Solicitacoes } from "./pages/Solicitacoes";
import { PublicBooking } from "./pages/PublicBooking";

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
        path="/agenda"
        element={
          <RequireAuth>
            <Agenda />
          </RequireAuth>
        }
      />
      <Route
        path="/disponibilidade"
        element={
          <RequireAuth>
            <Disponibilidade />
          </RequireAuth>
        }
      />
      <Route
        path="/solicitacoes"
        element={
          <RequireAuth>
            <Solicitacoes />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/agenda" replace />} />
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
