/**
 * Sanitizes returnTo redirects to prevent Open Redirect vulnerabilities.
 * Handles encoded variants (%2f%2f, %5c), control characters, tabs, newlines,
 * null bytes, and malicious scheme variations (javascript:, data:, vbscript:, ://).
 */
export function sanitizeReturnTo(rawReturnTo: string | null | undefined): string {
  if (!rawReturnTo || typeof rawReturnTo !== "string") {
    return "/overview";
  }

  let decoded = rawReturnTo.trim();

  // Decode URI encoding once (protects against %2f%2fevil.com, %5cevil.com)
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Malformed URI sequence -> fallback to safe default
    return "/overview";
  }

  // Strip control characters, newlines, carriage returns, tabs, and null bytes
  // eslint-disable-next-line no-control-regex
  decoded = decoded.replace(/[\x00-\x1F\x7F-\x9F\r\n\t]/g, "").trim();

  // Must begin with a single slash '/'
  if (!decoded.startsWith("/")) {
    return "/overview";
  }

  // Reject protocol-relative URLs (//) or backslash variations (/\ or /\\ or \\)
  if (decoded.startsWith("//") || decoded.startsWith("/\\") || decoded.startsWith("\\")) {
    return "/overview";
  }

  // Reject directory traversal sequences
  if (decoded.includes("..")) {
    return "/overview";
  }

  // Reject backslashes anywhere in the path (browser normalization trick)
  if (decoded.includes("\\")) {
    return "/overview";
  }

  // Reject explicit or disguised URI schemes
  const lower = decoded.toLowerCase();
  if (
    lower.includes("://") ||
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return "/overview";
  }

  return decoded;
}
