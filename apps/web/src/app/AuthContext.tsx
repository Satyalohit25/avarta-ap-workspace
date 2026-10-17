import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { CurrentUser, SignupPayload, fetchCurrentUser, login as apiLogin, logout as apiLogout, signup as apiSignup } from "../api/auth";
import { getAccessToken } from "../api/client";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  setPersonaRole: (role: "Administrator" | "Finance Manager" | "Finance Executive" | "Approver" | "Read Only") => void;
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

  async function signup(payload: SignupPayload) {
    const newUser = await apiSignup(payload);
    setUser(newUser);
  }

  function logout() {
    apiLogout();
    setUser(null);
  }

  function setPersonaRole(role: "Administrator" | "Finance Manager" | "Finance Executive" | "Approver" | "Read Only") {
    setUser((prev) => (prev ? { ...prev, role } : null));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setPersonaRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
