/**
 * Live HTTP security probes.
 *
 * Boots the real Express app on an ephemeral port inside this process and
 * asserts the cross-origin and server-side-request-forgery guards behave
 * correctly over actual HTTP. Uses `fetch` rather than a blocking shell call
 * so the in-process server can respond.
 *
 * Run with: pnpm --filter @ap-saas/api probe:security
 */
import http from "node:http";
import { createApp } from "../src/app/app";
import { signAccessToken } from "../src/lib/jwt";

interface ProbeResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: ProbeResult[] = [];

function record(name: string, passed: boolean, detail: string): void {
  results.push({ name, passed, detail });
  console.log(`${passed ? "[PASS]" : "[FAIL]"} ${name} — ${detail}`);
}

async function main(): Promise<void> {
  console.log("================================================================================");
  console.log("             AVARTA AP WORKSPACE - LIVE HTTP SECURITY PROBES                    ");
  console.log("================================================================================\n");

  const server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[SERVER] Ephemeral API listening on ${baseUrl}\n`);

  try {
    const adminToken = signAccessToken({
      userId: "probe-admin-001",
      organizationId: "probe-org-001",
      role: "ADMINISTRATOR",
    });

    console.log("--- CORS: hostile origins must not receive an allow header ---");
    const hostileOrigins = [
      ["Opaque null origin", "null"],
      ["Lookalike domain", "https://evil-avarta.dev"],
      ["Arbitrary Vercel subdomain", "https://subdomain.vercel.app"],
      ["Localhost substring spoof", "http://localhost.evil.com"],
      ["Generic attacker domain", "https://attacker.com"],
    ];

    for (const [name, origin] of hostileOrigins) {
      const res = await fetch(`${baseUrl}/health`, { headers: { Origin: origin } });
      const allow = res.headers.get("access-control-allow-origin");
      record(
        `CORS rejects ${name}`,
        allow === null,
        allow === null ? "no Access-Control-Allow-Origin header" : `header leaked: ${allow}`
      );
    }

    const baselineOrigin = process.env.WEB_ORIGIN?.split(",")[0]?.trim() || "http://localhost:5173";
    const baseline = await fetch(`${baseUrl}/health`, {
      headers: { Origin: baselineOrigin },
    });
    record(
      "CORS allows the configured workspace origin",
      baseline.headers.get("access-control-allow-origin") === baselineOrigin,
      `origin ${baselineOrigin}`
    );

    console.log("\n--- SSRF: Tally ERP gateway targets must be rejected ---");
    const probeErp = async (gatewayUrl: string): Promise<string> => {
      const res = await fetch(`${baseUrl}/api/v1/integrations/erp/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ provider: "tally", config: { gatewayUrl }, save: false }),
      });
      return `${res.status} ${await res.text()}`;
    };

    delete process.env.ALLOW_LOCAL_TALLY;
    const loopbackResponse = await probeErp("http://127.0.0.1:54321");
    record(
      "SSRF blocks loopback addresses",
      loopbackResponse.includes("Loopback address prohibited"),
      loopbackResponse.slice(0, 160)
    );

    const localhostResponse = await probeErp("http://localhost:9000");
    record(
      "SSRF blocks localhost when the dev override is off",
      localhostResponse.includes("is prohibited"),
      localhostResponse.slice(0, 160)
    );

    process.env.ALLOW_LOCAL_TALLY = "true";
    const allowedResponse = await probeErp("http://localhost:9000");
    record(
      "Dev override permits localhost:9000 only",
      !allowedResponse.includes("SSRF Rejection"),
      allowedResponse.slice(0, 160)
    );

    const stillBlocked = await probeErp("http://127.0.0.1:54321");
    record(
      "Dev override does not unlock other loopback ports",
      stillBlocked.includes("Loopback address prohibited"),
      stillBlocked.slice(0, 160)
    );

    console.log("\n--- API keys: privileged surfaces must reject machine credentials ---");
    const keyRes = await fetch(`${baseUrl}/api/v1/organization/settings`, {
      headers: { Authorization: "Bearer apk_probe_should_never_authenticate" },
    });
    record(
      "Invalid API key is rejected",
      keyRes.status === 401,
      `HTTP ${keyRes.status}`
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const failed = results.filter((result) => !result.passed);
  console.log("\n================================================================================");
  console.log(`${results.length - failed.length}/${results.length} live probes passed`);
  console.log("================================================================================");
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("FATAL PROBE RUNNER ERROR:", err);
  process.exit(1);
});
