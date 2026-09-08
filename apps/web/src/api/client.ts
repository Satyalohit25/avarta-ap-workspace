export const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

let accessToken: string | null =
  localStorage.getItem("avarta_token") || localStorage.getItem("clearops_token");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem("avarta_token", token);
  } else {
    localStorage.removeItem("avarta_token");
    localStorage.removeItem("clearops_token");
  }
}

export function getAccessToken() {
  return accessToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class ApiRequestError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const url = new URL(API_URL + path, baseUrl);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const method = options.method ?? "GET";
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(method !== "GET" ? { "Idempotency-Key": crypto.randomUUID() } : {}),
    ...options.headers,
  };

  const body = isFormData
    ? (options.body as FormData)
    : options.body
    ? JSON.stringify(options.body)
    : undefined;

  // Handle timeout and abort signals
  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiRequestError(408, "TIMEOUT", "Request timed out or was aborted");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    setAccessToken(null);
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/track")
    ) {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    const message = json?.error?.message ?? "Request failed";
    throw new ApiRequestError(res.status, json?.error?.code ?? "UNKNOWN", message);
  }

  return json as T;
}
