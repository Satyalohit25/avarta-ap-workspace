import { apiRequest, setAccessToken } from "./client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  role: string;
  organizationName?: string;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await apiRequest<{ user: CurrentUser; accessToken: string }>("/auth/login", {
    method: "POST",
    body: { email: normalizedEmail, password },
  });
  setAccessToken(result.accessToken);
  localStorage.setItem("avarta_user", JSON.stringify(result.user));
  return result.user;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  try {
    return await apiRequest<CurrentUser>("/auth/me");
  } catch (err) {
    const cached = localStorage.getItem("avarta_user");
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
  localStorage.removeItem("avarta_user");
}
