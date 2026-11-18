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
  mfaEnabled?: boolean;
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

export interface LoginResult {
  mfaRequired: boolean;
  challengeToken?: string;
  user?: CurrentUser;
}

export interface MfaEnrollResult {
  secret: string;
  otpauthUri: string;
}

export interface MfaEnableResult {
  recoveryCodes: string[];
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

export async function login(email: string, password: string): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await apiRequest<{
    mfaRequired?: boolean;
    challengeToken?: string;
    user?: CurrentUser;
    accessToken?: string;
  }>("/auth/login", {
    method: "POST",
    body: { email: normalizedEmail, password },
  });

  if (result.mfaRequired) {
    return {
      mfaRequired: true,
      challengeToken: result.challengeToken,
    };
  }

  if (result.accessToken) {
    setAccessToken(result.accessToken);
  }
  return {
    mfaRequired: false,
    user: result.user,
  };
}

export async function challengeMfa(challengeToken: string, code: string): Promise<CurrentUser> {
  const result = await apiRequest<{ user: CurrentUser; accessToken: string }>("/auth/mfa/challenge", {
    method: "POST",
    body: { challengeToken, code: code.trim() },
  });
  setAccessToken(result.accessToken);
  return result.user;
}

export async function enrollMfa(): Promise<MfaEnrollResult> {
  return await apiRequest<MfaEnrollResult>("/auth/mfa/enroll", {
    method: "POST",
  });
}

export async function enableMfa(secret: string, code: string): Promise<MfaEnableResult> {
  return await apiRequest<MfaEnableResult>("/auth/mfa/enable", {
    method: "POST",
    body: { secret, code: code.trim() },
  });
}

export async function disableMfa(password: string, code: string): Promise<{ success: boolean }> {
  return await apiRequest<{ success: boolean }>("/auth/mfa/disable", {
    method: "POST",
    body: { password, code: code.trim() },
  });
}

export async function regenerateRecoveryCodes(password: string, code: string): Promise<{ recoveryCodes: string[] }> {
  return await apiRequest<{ recoveryCodes: string[] }>("/auth/mfa/recovery-codes", {
    method: "POST",
    body: { password, code: code.trim() },
  });
}

let inFlightRefreshPromise: Promise<string> | null = null;

export async function refreshAuthToken(): Promise<string> {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  const executeRefresh = async (): Promise<string> => {
    try {
      // The refresh token is an httpOnly cookie; no request body is needed.
      const result = await apiRequest<{ accessToken: string }>("/auth/refresh", {
        method: "POST",
      });
      setAccessToken(result.accessToken);
      return result.accessToken;
    } finally {
      inFlightRefreshPromise = null;
    }
  };

  // Cross-tab coordination: Use Web Locks API (navigator.locks) when available
  if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks?.request) {
    inFlightRefreshPromise = (async () => {
      const token = await navigator.locks.request("avarta_auth_refresh_lock", async () => {
        return await executeRefresh();
      });
      return token as string;
    })();
  } else {
    inFlightRefreshPromise = executeRefresh();
  }

  return await inFlightRefreshPromise;
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
