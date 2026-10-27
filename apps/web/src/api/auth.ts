import { apiRequest, setAccessToken } from "./client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  role: string;
  organizationName?: string;
  activeAdminCount?: number;
  isSoloAdmin?: boolean;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  country?: string;
  termsAccepted: boolean;
}

export interface AuthConfig {
  signupEnabled: boolean;
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  return await apiRequest<AuthConfig>("/auth/config");
}

export async function signup(payload: SignupPayload): Promise<CurrentUser> {
  const result = await apiRequest<{ user: CurrentUser; accessToken: string; refreshToken?: string }>("/auth/signup", {
    method: "POST",
    body: payload,
  });
  setAccessToken(result.accessToken);
  if (result.refreshToken) {
    localStorage.setItem("avarta_refresh_token", result.refreshToken);
  }
  localStorage.setItem("avarta_user", JSON.stringify(result.user));
  localStorage.setItem("avarta_is_new_user", "true");
  return result.user;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await apiRequest<{ user: CurrentUser; accessToken: string; refreshToken?: string }>("/auth/login", {
    method: "POST",
    body: { email: normalizedEmail, password },
  });
  setAccessToken(result.accessToken);
  if (result.refreshToken) {
    localStorage.setItem("avarta_refresh_token", result.refreshToken);
  }
  localStorage.setItem("avarta_user", JSON.stringify(result.user));
  return result.user;
}

export async function refreshAuthToken(): Promise<string> {
  const currentRefreshToken = localStorage.getItem("avarta_refresh_token");
  if (!currentRefreshToken) {
    throw new Error("No refresh token stored");
  }
  const result = await apiRequest<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
    method: "POST",
    body: { refreshToken: currentRefreshToken },
  });
  setAccessToken(result.accessToken);
  localStorage.setItem("avarta_refresh_token", result.refreshToken);
  return result.accessToken;
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

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("avarta_refresh_token");
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : undefined,
    });
  } catch {
    // Network errors during logout should not prevent local session cleanup
  } finally {
    setAccessToken(null);
    localStorage.removeItem("avarta_user");
    localStorage.removeItem("avarta_refresh_token");
    localStorage.removeItem("avarta_is_new_user");
    localStorage.removeItem("avarta_email_verified");
    sessionStorage.clear();
    window.dispatchEvent(new Event("auth:logout"));
  }
}
