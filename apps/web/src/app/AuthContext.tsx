import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { CurrentUser, fetchCurrentUser, login as apiLogin, logout as apiLogout } from "../api/auth";
import { getAccessToken } from "../api/client";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const current = await fetchCurrentUser();
        setUser(current);
      } catch {
        apiLogout();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email: string, password: string) {
    const loggedInUser = await apiLogin(email, password);
    setUser(loggedInUser);
  }

  function logout() {
    apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
