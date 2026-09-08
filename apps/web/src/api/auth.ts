import { apiRequest, setAccessToken } from "./client";
import { DEMO_USERS } from "../lib/constants";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  role: string;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await apiRequest<{ user: CurrentUser; accessToken: string }>("/auth/login", {
      method: "POST",
      body: { email: normalizedEmail, password },
    });
    setAccessToken(result.accessToken);
    localStorage.setItem("avarta_demo_user", JSON.stringify(result.user));
    return result.user;
  } catch (err) {
    // Demo seed fallback if backend database is offline or unseeded
    const demoUser = DEMO_USERS[normalizedEmail];
    if (demoUser && password === "password123") {
      const mockToken = `demo_jwt_${demoUser.role.toLowerCase()}_token`;
      setAccessToken(mockToken);
      localStorage.setItem("avarta_demo_user", JSON.stringify(demoUser));
      return demoUser;
    }
    throw err;
  }
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  try {
    return await apiRequest<CurrentUser>("/auth/me");
  } catch (err) {
    const cached =
      localStorage.getItem("avarta_demo_user") ||
      localStorage.getItem("clearops_demo_user");
    if (cached) {
      try {
        return JSON.parse(cached) as CurrentUser;
      } catch {
        // ignore JSON parse error
      }
    }
    throw err;
  }
}

export function logout() {
  setAccessToken(null);
  localStorage.removeItem("avarta_demo_user");
  localStorage.removeItem("clearops_demo_user");
}
