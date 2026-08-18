import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthClinic {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  clinic: AuthClinic | null;
  login: (token: string, user: AuthUser, clinic: AuthClinic) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [clinic, setClinic] = useState<AuthClinic | null>(() => {
    const raw = localStorage.getItem("clinic");
    return raw ? JSON.parse(raw) : null;
  });

  function login(newToken: string, newUser: AuthUser, newClinic: AuthClinic) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("clinic", JSON.stringify(newClinic));
    setToken(newToken);
    setUser(newUser);
    setClinic(newClinic);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("clinic");
    setToken(null);
    setUser(null);
    setClinic(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, clinic, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
