import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  CurrentUser,
  SignupPayload,
  fetchCurrentUser,
  login as apiLogin,
  challengeMfa as apiChallengeMfa,
  logout as apiLogout,
  refreshAuthToken,
  signup as apiSignup,
} from "../api/auth";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mfaRequired: boolean; challengeToken?: string }>;
  challengeMfa: (challengeToken: string, code: string) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
    const res = await apiLogin(email, password);
    if (!res.mfaRequired && res.user) {
      setUser(res.user);
    }
    return {
      mfaRequired: Boolean(res.mfaRequired),
      challengeToken: res.challengeToken,
    };
  }

  async function challengeMfa(challengeToken: string, code: string) {
    const loggedInUser = await apiChallengeMfa(challengeToken, code);
    setUser(loggedInUser);
  }

  async function refreshUser() {
    try {
      const current = await fetchCurrentUser();
      setUser(current);
    } catch {
      // ignore
    }
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
    <AuthContext.Provider value={{ user, loading, login, challengeMfa, refreshUser, signup, logout, setPersonaRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
