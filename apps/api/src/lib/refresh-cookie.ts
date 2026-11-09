import type { Request, Response } from "express";

export const REFRESH_COOKIE_NAME = "avarta_refresh";
const REFRESH_COOKIE_PATH = "/api";
const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function cookieAttributes(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  // SameSite=Strict keeps the refresh cookie off cross-site requests, which
  // removes the CSRF surface that a cookie-based refresh flow would add.
  return `HttpOnly; Path=${REFRESH_COOKIE_PATH}; SameSite=Strict${secure}`;
}

export function setRefreshCookie(res: Response, token: string): void {
  res.append(
    "Set-Cookie",
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes()}; Max-Age=${REFRESH_COOKIE_MAX_AGE_SECONDS}`
  );
}

export function clearRefreshCookie(res: Response): void {
  res.append(
    "Set-Cookie",
    `${REFRESH_COOKIE_NAME}=; ${cookieAttributes()}; Max-Age=0`
  );
}

export function readRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}
