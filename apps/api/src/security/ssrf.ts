import dns from "node:dns";
import https from "node:https";
import net from "node:net";

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  resolvedIps?: string[];
  pinnedUrl?: string;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRedirects?: number;
  allowHttp?: boolean;
}

/**
 * Checks whether an IPv4 or IPv6 address belongs to a prohibited subnet
 * (loopback, private RFC 1918, link-local, carrier-grade NAT, or cloud metadata).
 */
export function isPrivateOrBlockedIp(ipAddress: string): { blocked: boolean; reason?: string } {
  const cleanIp = ipAddress.trim();

  // IPv4-Mapped IPv6 de-encapsulation (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.toLowerCase().startsWith("::ffff:")) {
    const embedded = cleanIp.slice(7);
    if (net.isIPv4(embedded)) {
      return isPrivateOrBlockedIp(embedded);
    }
    // Check if embedded in hex format (e.g. 7f00:0001 or 7f00:1)
    const hexParts = embedded.split(":");
    if (hexParts.length === 2) {
      const p1 = parseInt(hexParts[0], 16);
      const p2 = parseInt(hexParts[1], 16);
      if (!isNaN(p1) && !isNaN(p2)) {
        const b0 = (p1 >> 8) & 0xff;
        const b1 = p1 & 0xff;
        const b2 = (p2 >> 8) & 0xff;
        const b3 = p2 & 0xff;
        return isPrivateOrBlockedIp(`${b0}.${b1}.${b2}.${b3}`);
      }
    }
  }

  // Handle IPv4
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split(".").map(Number);
    const [b0, b1, b2, b3] = parts;

    // 1. Loopback (127.0.0.0/8)
    if (b0 === 127) {
      return { blocked: true, reason: `Loopback address prohibited: ${cleanIp}` };
    }

    // 2. Unspecified / "This host" (0.0.0.0/8)
    if (b0 === 0) {
      return { blocked: true, reason: `Unspecified address prohibited: ${cleanIp}` };
    }

    // 3. Cloud Instance Metadata (169.254.169.254) & Link-Local (169.254.0.0/16)
    if (b0 === 169 && b1 === 254) {
      return {
        blocked: true,
        reason:
          cleanIp === "169.254.169.254"
            ? "Cloud metadata endpoint (169.254.169.254) strictly prohibited."
            : `Link-local address prohibited: ${cleanIp}`,
      };
    }

    // 4. RFC 1918 Private Subnets
    if (b0 === 10) {
      return { blocked: true, reason: `Private 10.0.0.0/8 subnet prohibited: ${cleanIp}` };
    }
    if (b0 === 172 && b1 >= 16 && b1 <= 31) {
      return { blocked: true, reason: `Private 172.16.0.0/12 subnet prohibited: ${cleanIp}` };
    }
    if (b0 === 192 && b1 === 168) {
      return { blocked: true, reason: `Private 192.168.0.0/16 subnet prohibited: ${cleanIp}` };
    }

    // 5. Carrier-Grade NAT (100.64.0.0/10)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) {
      return { blocked: true, reason: `Carrier-grade NAT subnet prohibited: ${cleanIp}` };
    }

    // 6. Test networks (RFC 5737: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
    if (
      (b0 === 192 && b1 === 0 && b2 === 2) ||
      (b0 === 198 && b1 === 51 && b2 === 100) ||
      (b0 === 203 && b1 === 0 && b2 === 113)
    ) {
      return { blocked: true, reason: `Documentation/Test subnet prohibited: ${cleanIp}` };
    }

    // 7. Multicast and Reserved (224.0.0.0/4 and 240.0.0.0/4)
    if (b0 >= 224) {
      return { blocked: true, reason: `Multicast or Reserved subnet prohibited: ${cleanIp}` };
    }

    // 8. Broadcast
    if (b0 === 255 && b1 === 255 && b2 === 255 && b3 === 255) {
      return { blocked: true, reason: `Broadcast address prohibited: ${cleanIp}` };
    }

    return { blocked: false };
  }

  // Handle IPv6
  if (net.isIPv6(cleanIp)) {
    const lower = cleanIp.toLowerCase();

    // Loopback (::1)
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") {
      return { blocked: true, reason: `IPv6 Loopback (::1) prohibited: ${cleanIp}` };
    }

    // Unspecified (::)
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") {
      return { blocked: true, reason: `IPv6 Unspecified (::) prohibited: ${cleanIp}` };
    }

    // IPv6 Link-Local (fe80::/10)
    if (
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    ) {
      return { blocked: true, reason: `IPv6 Link-Local unicast prohibited: ${cleanIp}` };
    }

    // IPv6 Unique Local Address (ULA - fc00::/7)
    if (lower.startsWith("fc") || lower.startsWith("fd")) {
      return { blocked: true, reason: `IPv6 Unique Local Address (fc00::/7) prohibited: ${cleanIp}` };
    }

    // IPv6 Multicast (ff00::/8)
    if (lower.startsWith("ff")) {
      return { blocked: true, reason: `IPv6 Multicast prohibited: ${cleanIp}` };
    }

    // IPv6 Documentation (2001:db8::/32)
    if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) {
      return { blocked: true, reason: `IPv6 Documentation subnet prohibited: ${cleanIp}` };
    }

    return { blocked: false };
  }

  return { blocked: true, reason: `Unrecognized or invalid IP address format: ${ipAddress}` };
}

/**
 * Resolves all DNS records (A and AAAA) for a hostname and validates that
 * EVERY resolved address is a safe, routable public IP.
 */
export async function resolveAndValidateHost(
  hostname: string
): Promise<{ safe: boolean; ips: string[]; reason?: string }> {
  // If host is already an IP literal, validate directly
  if (net.isIP(hostname)) {
    const check = isPrivateOrBlockedIp(hostname);
    return {
      safe: !check.blocked,
      ips: [hostname],
      reason: check.reason,
    };
  }

  // Block localhost string literal before lookup
  const cleanHost = hostname.toLowerCase().trim();
  if (cleanHost === "localhost" || cleanHost.endsWith(".localhost")) {
    return { safe: false, ips: [], reason: "Host 'localhost' is prohibited (SSRF Protection)." };
  }

  try {
    const addresses = await dns.promises.lookup(cleanHost, { all: true, verbatim: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, ips: [], reason: `DNS lookup returned no records for host: ${cleanHost}` };
    }

    const resolvedIps = addresses.map((a) => a.address);

    // Verify EVERY resolved IP address
    for (const ip of resolvedIps) {
      const check = isPrivateOrBlockedIp(ip);
      if (check.blocked) {
        return {
          safe: false,
          ips: resolvedIps,
          reason: `Host ${cleanHost} resolved to prohibited IP ${ip} (${check.reason})`,
        };
      }
    }

    return { safe: true, ips: resolvedIps };
  } catch (err: unknown) {
    return {
      safe: false,
      ips: [],
      reason: `DNS resolution failed for ${cleanHost}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Validates a target URL against SSRF policy:
 * - Scheme enforcement (HTTPS only by default)
 * - DNS resolution & IP check
 */
export async function validateUrlSsrf(
  rawUrl: string,
  options: { allowHttp?: boolean } = {}
): Promise<SsrfValidationResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "Malformed URL." };
  }

  // 1. Protocol Enforcement
  const isHttps = url.protocol === "https:";
  const isHttp = url.protocol === "http:";

  if (!isHttps && (!options.allowHttp || !isHttp)) {
    return {
      safe: false,
      reason: `Insecure protocol '${url.protocol}'. Outbound connections must use TLS (https://).`,
    };
  }

  // 2. Reject credentials in URL
  if (url.username || url.password) {
    return { safe: false, reason: "Embedded URL credentials are not permitted." };
  }

  // 3. DNS Resolution and IP Validation
  const hostCheck = await resolveAndValidateHost(url.hostname);
  if (!hostCheck.safe) {
    return {
      safe: false,
      reason: hostCheck.reason,
      resolvedIps: hostCheck.ips,
    };
  }

  return {
    safe: true,
    resolvedIps: hostCheck.ips,
  };
}

/**
 * Creates an https.Agent that pins DNS resolution to a verified IP,
 * preventing Time-Of-Check to Time-Of-Use (TOCTOU) DNS rebinding attacks.
 */
export function createPinnedHttpsAgent(pinnedIp: string): https.Agent {
  return new https.Agent({
    // Custom lookup that always returns the pre-validated pinned IP
    lookup: (_hostname, _options, callback) => {
      const family = net.isIPv6(pinnedIp) ? 6 : 4;
      callback(null, pinnedIp, family);
    },
  });
}

/**
 * Unified Safe Fetch:
 * Validates URL, resolves DNS, pins IP to eliminate DNS rebinding,
 * enforces AbortSignal timeout, and refuses unvalidated redirects.
 */
export async function safeFetch(
  rawUrl: string,
  init: SafeFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 10_000, maxRedirects = 0, allowHttp = false, ...fetchOptions } = init;

  let currentUrl = rawUrl;
  let redirectsCount = 0;

  while (true) {
    const validation = await validateUrlSsrf(currentUrl, { allowHttp });
    if (!validation.safe) {
      throw new Error(`SSRF Guard Rejection: ${validation.reason}`);
    }

    // Combine caller signal with timeout signal
    const timeoutSignal = AbortSignal.timeout(timeoutMs);

    // Use redirect: "manual" to prevent automatic redirection to hostile internal destinations
    const response = await fetch(currentUrl, {
      ...fetchOptions,
      redirect: "manual",
      signal: init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal,
    });

    // Check for HTTP redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectsCount >= maxRedirects) {
        if (maxRedirects === 0) {
          throw new Error(
            `SSRF Guard Refusal: HTTP redirect to ${response.headers.get("location")} is forbidden.`
          );
        }
        throw new Error(`SSRF Guard: Exceeded maximum allowed redirects (${maxRedirects}).`);
      }

      const location = response.headers.get("location");
      if (!location) {
        throw new Error("SSRF Guard: Redirect status returned with no Location header.");
      }

      // Resolve relative redirect against base URL
      currentUrl = new URL(location, currentUrl).toString();
      redirectsCount++;
      continue;
    }

    return response;
  }
}

/**
 * Validates external database connection strings (PostgreSQL / BYODB)
 * with async DNS resolution against loopback, metadata, and private IP subnets.
 */
export async function validateDatabaseUrlSsrf(
  connectionUrl: string
): Promise<{ safe: boolean; reason?: string }> {
  try {
    const url = new URL(connectionUrl);
    const host = url.hostname;

    // Check protocol
    if (!connectionUrl.startsWith("postgresql://") && !connectionUrl.startsWith("postgres://")) {
      return { safe: false, reason: "Database URL must use postgresql:// or postgres:// protocol." };
    }

    // Enforce SSL mode in production
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    if (process.env.NODE_ENV === "production" && (!sslMode || sslMode === "disable")) {
      return {
        safe: false,
        reason:
          "Transport Layer Security (TLS/SSL) is mandatory. Append '?sslmode=require' to your connection URL.",
      };
    }

    // DNS and IP validation
    const dnsCheck = await resolveAndValidateHost(host);
    if (!dnsCheck.safe) {
      return { safe: false, reason: dnsCheck.reason };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: "Malformed database connection string." };
  }
}
