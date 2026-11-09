import { describe, it, expect } from "vitest";
import {
  isPrivateOrBlockedIp,
  resolveAndValidateHost,
  validateUrlSsrf,
  safeFetch,
  validateDatabaseUrlSsrf,
} from "./ssrf";

describe("Unified SSRF Guard Suite", () => {
  describe("1. isPrivateOrBlockedIp Subnet Verification", () => {
    it("blocks IPv4 loopback (127.0.0.0/8)", () => {
      expect(isPrivateOrBlockedIp("127.0.0.1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("127.0.1.1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("127.255.255.254").blocked).toBe(true);
    });

    it("blocks unspecified address (0.0.0.0/8)", () => {
      expect(isPrivateOrBlockedIp("0.0.0.0").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("0.0.0.1").blocked).toBe(true);
    });

    it("blocks cloud metadata endpoint 169.254.169.254 and link-local (169.254.0.0/16)", () => {
      const meta = isPrivateOrBlockedIp("169.254.169.254");
      expect(meta.blocked).toBe(true);
      expect(meta.reason).toContain("metadata");

      expect(isPrivateOrBlockedIp("169.254.1.1").blocked).toBe(true);
    });

    it("blocks RFC 1918 private subnets", () => {
      // 10.0.0.0/8
      expect(isPrivateOrBlockedIp("10.0.0.1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("10.255.255.255").blocked).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateOrBlockedIp("172.16.0.1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("172.31.255.255").blocked).toBe(true);
      // Public 172.x should not be blocked by 172.16/12 rule
      expect(isPrivateOrBlockedIp("172.15.0.1").blocked).toBe(false);
      expect(isPrivateOrBlockedIp("172.32.0.1").blocked).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateOrBlockedIp("192.168.0.1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("192.168.254.254").blocked).toBe(true);
    });

    it("blocks Carrier-Grade NAT (100.64.0.0/10)", () => {
      expect(isPrivateOrBlockedIp("100.64.0.1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("100.127.255.254").blocked).toBe(true);
    });

    it("blocks IPv6 loopback (::1) and unspecified (::)", () => {
      expect(isPrivateOrBlockedIp("::1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("::").blocked).toBe(true);
    });

    it("blocks IPv6 Link-Local (fe80::/10) and ULA (fc00::/7)", () => {
      expect(isPrivateOrBlockedIp("fe80::1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("fc00::1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("fd12:3456:789a::1").blocked).toBe(true);
    });

    it("de-encapsulates IPv4-mapped IPv6 addresses (::ffff:...)", () => {
      expect(isPrivateOrBlockedIp("::ffff:127.0.0.1").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("::ffff:169.254.169.254").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("::ffff:10.0.1.2").blocked).toBe(true);
      expect(isPrivateOrBlockedIp("::ffff:8.8.8.8").blocked).toBe(false);
    });

    it("allows valid public IPv4 addresses", () => {
      expect(isPrivateOrBlockedIp("8.8.8.8").blocked).toBe(false);
      expect(isPrivateOrBlockedIp("1.1.1.1").blocked).toBe(false);
      expect(isPrivateOrBlockedIp("93.184.216.34").blocked).toBe(false);
    });
  });

  describe("2. resolveAndValidateHost DNS Verification", () => {
    it("rejects literal localhost hostname", async () => {
      const res = await resolveAndValidateHost("localhost");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("localhost");
    });

    it("rejects loopback IP literal", async () => {
      const res = await resolveAndValidateHost("127.0.0.1");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("Loopback");
    });

    it("rejects metadata IP literal", async () => {
      const res = await resolveAndValidateHost("169.254.169.254");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("metadata");
    });
  });

  describe("3. validateUrlSsrf Protocol & Host Validation", () => {
    it("rejects plain HTTP by default when TLS is required", async () => {
      const res = await validateUrlSsrf("http://8.8.8.8/test");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("Insecure protocol");
    });

    it("allows HTTP when allowHttp option is true for safe public host", async () => {
      const res = await validateUrlSsrf("http://8.8.8.8/test", { allowHttp: true });
      expect(res.safe).toBe(true);
    });

    it("rejects embedded user/password credentials in URL", async () => {
      const res = await validateUrlSsrf("https://admin:secret@8.8.8.8/api");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("credentials");
    });

    it("rejects URLs pointing to private IP subnets", async () => {
      const res = await validateUrlSsrf("https://10.0.0.1/api");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("Private");
    });

    it("rejects URLs pointing to cloud metadata", async () => {
      const res = await validateUrlSsrf("http://169.254.169.254/latest/meta-data", {
        allowHttp: true,
      });
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("metadata");
    });
  });

  describe("4. safeFetch Redirect & Rejection Invariants", () => {
    it("throws SSRF Guard Rejection on unsafe URL", async () => {
      await expect(safeFetch("http://169.254.169.254/secret")).rejects.toThrow(
        /SSRF Guard Rejection/
      );
    });
  });

  describe("5. validateDatabaseUrlSsrf BYODB Validation", () => {
    it("rejects non-Postgres protocols", async () => {
      const res = await validateDatabaseUrlSsrf("mysql://user:pass@db.example.com/db");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("postgresql:// or postgres://");
    });

    it("rejects loopback and private database hosts", async () => {
      const res1 = await validateDatabaseUrlSsrf("postgresql://user:pass@127.0.0.1:5432/db");
      expect(res1.safe).toBe(false);

      const res2 = await validateDatabaseUrlSsrf("postgresql://user:pass@localhost:5432/db");
      expect(res2.safe).toBe(false);

      const res3 = await validateDatabaseUrlSsrf("postgresql://user:pass@10.0.0.5:5432/db");
      expect(res3.safe).toBe(false);
    });

    it("rejects cloud metadata database hosts", async () => {
      const res = await validateDatabaseUrlSsrf("postgresql://user:pass@169.254.169.254:5432/db");
      expect(res.safe).toBe(false);
      expect(res.reason).toContain("metadata");
    });

    it("allows valid public database URLs with safe IP", async () => {
      const res = await validateDatabaseUrlSsrf("postgresql://user:pass@8.8.8.8:5432/db");
      expect(res.safe).toBe(true);
    });
  });
});
