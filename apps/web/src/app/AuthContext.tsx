import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  CurrentUser,
  SignupPayload,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  refreshAuthToken,
  signup as apiSignup,
} from "../api/auth";

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
      // The access token lives in memory only, so on a page reload the only
      // way back in is the httpOnly refresh cookie. Refresh first, then
      // confirm the session with /auth/me. A missing/expired cookie simply
      // means the visitor is signed out — not an error to surface.
      try {
        await refreshAuthToken();
        const current = await fetchCurrentUser();
        setUser(current);
      } catch {
        setUser(null);
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

  async function logout() {
    await apiLogout();
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
