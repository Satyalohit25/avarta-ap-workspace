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
  const result = await apiRequest<{ user: CurrentUser; accessToken: string }>("/auth/signup", {
    method: "POST",
    body: payload,
  });
  setAccessToken(result.accessToken);
  localStorage.setItem("avarta_is_new_user", "true");
  return result.user;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await apiRequest<{ user: CurrentUser; accessToken: string }>("/auth/login", {
    method: "POST",
    body: { email: normalizedEmail, password },
  });
  setAccessToken(result.accessToken);
  return result.user;
}

export async function refreshAuthToken(): Promise<string> {
  // The refresh token is an httpOnly cookie; no request body is needed.
  const result = await apiRequest<{ accessToken: string }>("/auth/refresh", {
    method: "POST",
  });
  setAccessToken(result.accessToken);
  return result.accessToken;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return await apiRequest<CurrentUser>("/auth/me");
}

export async function acceptInvite(payload: {
  token: string;
  fullName: string;
  password: string;
}): Promise<void> {
  await apiRequest("/auth/invite/accept", {
    method: "POST",
    body: payload,
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Network errors during logout should not prevent local session cleanup
  } finally {
    setAccessToken(null);
    localStorage.removeItem("avarta_is_new_user");
    localStorage.removeItem("avarta_email_verified");
    sessionStorage.clear();
    window.dispatchEvent(new Event("auth:logout"));
  }
}

export type TeamRole =
  | "ADMINISTRATOR"
  | "FINANCE_MANAGER"
  | "FINANCE_EXECUTIVE"
  | "APPROVER"
  | "READ_ONLY";

export interface TeamMemberRecord {
  id: string;
  fullName: string;
  email: string;
  role: TeamRole;
  status: "ACTIVE" | "DEACTIVATED";
  createdAt: string;
}

export interface InvitationResult {
  id: string;
  email: string;
  role: TeamRole;
  invitationId: string;
  token?: string;
  inviteUrl?: string;
  emailSent: boolean;
  emailDeliveryError?: string;
  expiresAt: string;
  message: string;
}

export async function fetchTeamMembers(): Promise<TeamMemberRecord[]> {
  const res = await apiRequest<{ data: TeamMemberRecord[] }>("/auth/team");
  return res.data;
}

export async function inviteTeamMember(payload: {
  email: string;
  fullName: string;
  role: TeamRole;
}): Promise<InvitationResult> {
  const res = await apiRequest<{ data: InvitationResult }>("/auth/team/invite", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function deactivateTeamMember(userId: string): Promise<void> {
  await apiRequest(`/auth/team/${userId}/deactivate`, { method: "POST" });
}
