/**
 * Canonical list of public routes in Avarta AP Workspace.
 * Used by both the router and the 401 client interceptor to avoid redirecting
 * unauthenticated visitors browsing public content.
 */

export const PUBLIC_ROUTE_PATTERNS: (string | RegExp)[] = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/invite/accept",
  "/privacy",
  "/terms",
  "/dpa",
  "/subprocessors",
  "/refund",
  "/forbidden",
  "/403",
  /^\/track\/[^/]+$/,
  /^\/invoices\/track\/[^/]+$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => {
    if (typeof pattern === "string") {
      return pathname === pattern || pathname.startsWith(pattern + "/");
    }
    return pattern.test(pathname);
  });
}
