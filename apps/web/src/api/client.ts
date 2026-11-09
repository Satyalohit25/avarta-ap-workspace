export const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

// Access tokens live in memory only. The refresh token is an httpOnly cookie
// set by the API, so neither token is readable from JavaScript or persisted
// in localStorage.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * Stable key for a logical financial action. Callers may pass one;
   * otherwise a key is reused for identical mutations inside a short window
   * so double-clicks and network retries dedupe server-side.
   */
  idempotencyKey?: string;
}

// A user action (not an HTTP request) owns an idempotency key. Identical
// mutations within this window reuse the same key; later actions get a new one.
const IDEMPOTENCY_KEY_WINDOW_MS = 60_000;
const idempotencyKeyCache = new Map<string, { key: string; expiresAt: number }>();

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getStableIdempotencyKey(method: string, path: string, body: unknown): string {
  const fingerprint = `${method}:${path}:${
    typeof FormData !== "undefined" && body instanceof FormData ? "formdata" : JSON.stringify(body ?? {})
  }`;
  const now = Date.now();
  const cached = idempotencyKeyCache.get(fingerprint);
  if (cached && cached.expiresAt > now) {
    return cached.key;
  }
  if (idempotencyKeyCache.size > 100) {
    for (const [fp, entry] of idempotencyKeyCache) {
      if (entry.expiresAt <= now) idempotencyKeyCache.delete(fp);
    }
  }
  const key = newIdempotencyKey();
  idempotencyKeyCache.set(fingerprint, { key, expiresAt: now + IDEMPOTENCY_KEY_WINDOW_MS });
  return key;
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
    ...(method !== "GET"
      ? { "Idempotency-Key": options.idempotencyKey ?? getStableIdempotencyKey(method, path, options.body) }
      : {}),
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
      credentials: "include",
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
