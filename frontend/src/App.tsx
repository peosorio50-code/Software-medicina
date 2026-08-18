import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Agenda } from "./pages/Agenda";
import { Patients } from "./pages/Patients";
import { Prontuario } from "./pages/Prontuario";
import { Financeiro } from "./pages/Financeiro";
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
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/pacientes" element={<Patients />} />
        <Route path="/prontuario" element={<Prontuario />} />
        <Route path="/financeiro" element={<Financeiro />} />
      </Route>
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
