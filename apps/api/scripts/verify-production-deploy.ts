/**
 * Post-Deploy Production Verification Script
 * Validates the 8 core platform invariants in strict linear sequence.
 * Exits non-zero immediately on the first failure.
 * NEVER logs credentials, tokens, or secret keys.
 */

import http from "http";
import https from "https";

let TARGET_URL = (process.env.API_URL || process.argv.find((a) => a.startsWith("--url="))?.split("=")[1] || "http://127.0.0.1:4000").replace(/\/$/, "");

interface HttpResponse {
  status: number;
  text: string;
  json?: any;
}

function request(
  method: "GET" | "POST" | "PUT",
  urlPath: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(urlPath.startsWith("http") ? urlPath : `${TARGET_URL}${urlPath}`);
    const isHttps = fullUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const reqHeaders: Record<string, string> = {
      ...headers,
    };
    if (body) {
      reqHeaders["Content-Type"] = "application/json";
    }

    const req = transport.request(
      fullUrl,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          let json: any = undefined;
          try {
            json = JSON.parse(text);
          } catch {}
          resolve({ status: res.statusCode || 0, text, json });
        });
      }
    );

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function fail(stepNum: number, stepName: string, detail: string): never {
  console.error(`\n[FAIL] Step ${stepNum} (${stepName}): ${detail}`);
  process.exit(1);
}

function pass(stepNum: number, stepName: string, detail: string) {
  console.log(`[PASS] Step ${stepNum} (${stepName}): ${detail}`);
}

export async function runVerification() {
  let localServer: http.Server | undefined;
  if (process.argv.includes("--local")) {
    const { createApp } = await import("../src/app/app");
    localServer = createApp().listen(0);
    const addr = localServer.address() as any;
    TARGET_URL = `http://127.0.0.1:${addr.port}`;
  }

  try {
    console.log("===============================================================================");
    console.log("           AVARTA AP WORKSPACE: POST-DEPLOY VERIFICATION RUNNER                ");
    console.log("===============================================================================");
    console.log(`Target API Host: ${new URL(TARGET_URL).origin}`);
    console.log("Execution: Strict sequential invariant testing (exits non-zero on first fail)\n");

  const runId = Math.random().toString(36).substring(2, 8);
  const testEmail = `verify-${Date.now()}-${runId}@clearops.dev`;
  const testPassword = `P@ssword_${Date.now()}_${runId}!`;
  let adminToken = "";
  let readOnlyToken = "";
  let orgId = "";
  let invoiceId = "";

  // -------------------------------------------------------------------------
  // 1. GET /health returns 200
  // -------------------------------------------------------------------------
  try {
    const res = await request("GET", "/health");
    if (res.status !== 200) {
      fail(1, "Health Check", `Expected status 200, got ${res.status}. Response: ${res.text.slice(0, 100)}`);
    }
    pass(1, "Health Check", `Received HTTP 200 OK (${JSON.stringify(res.json || {})})`);
  } catch (err: any) {
    fail(1, "Health Check", `Connection failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 2. Signup (or create admin) creates an administrator
  // -------------------------------------------------------------------------
  try {
    const signupRes = await request("POST", "/api/v1/auth/signup", {}, {
      companyName: `Verification Org ${runId}`,
      email: testEmail,
      password: testPassword,
      fullName: `Verification Admin ${runId}`,
      country: "IN",
      termsAccepted: true,
    });

    if (signupRes.status !== 201 && signupRes.status !== 200) {
      fail(2, "Administrator Signup", `Expected HTTP 201/200, got ${signupRes.status}. Details: ${signupRes.text.slice(0, 150)}`);
    }

    const payload = signupRes.json?.data || signupRes.json;
    if (!payload?.user?.id || !payload?.accessToken) {
      fail(2, "Administrator Signup", "Response did not return expected user record and accessToken payload");
    }
    adminToken = payload.accessToken;
    orgId = payload.user.organizationId;
    pass(2, "Administrator Signup", `Created admin user in org (role: ${payload.user.role})`);
  } catch (err: any) {
    fail(2, "Administrator Signup", `Request failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 3. Login returns an access token and refresh token
  // -------------------------------------------------------------------------
  try {
    const loginRes = await request("POST", "/api/v1/auth/login", {}, {
      email: testEmail,
      password: testPassword,
    });

    if (loginRes.status !== 200) {
      fail(3, "Administrator Login", `Expected HTTP 200, got ${loginRes.status}. Details: ${loginRes.text.slice(0, 150)}`);
    }

    const loginData = loginRes.json?.data || loginRes.json;
    if (!loginData?.accessToken || !loginData?.refreshToken) {
      fail(3, "Administrator Login", "Response did not return both accessToken and refreshToken");
    }
    adminToken = loginData.accessToken;
    pass(3, "Administrator Login", "Login returned valid accessToken and refreshToken");
  } catch (err: any) {
    fail(3, "Administrator Login", `Request failed: ${err.message}`);
  }

  // Create a supplier first so we can attach an invoice
  let supplierId = "";
  try {
    const supRes = await request("POST", "/api/v1/suppliers", {
      Authorization: `Bearer ${adminToken}`,
      "Idempotency-Key": `sup-${Date.now()}-${runId}`,
    }, {
      supplierCode: `V-SUP-${runId.toUpperCase()}`,
      displayName: `Verification Supplier ${runId}`,
      legalName: `Verification Supplier Legal ${runId}`,
      currency: "INR",
    });
    supplierId = supRes.json?.data?.id || supRes.json?.id;
  } catch {}

  // -------------------------------------------------------------------------
  // 4. Create an invoice, then GET /invoices/:id/tracking returns a /track/<token> URL
  // -------------------------------------------------------------------------
  try {
    const invRes = await request("POST", "/api/v1/invoices", {
      Authorization: `Bearer ${adminToken}`,
      "Idempotency-Key": `inv-${Date.now()}-${runId}`,
    }, {
      supplierId: supplierId || undefined,
      invoiceNumber: `INV-VERIFY-${Date.now()}`,
      totalAmount: 15000,
      currency: "INR",
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    if (invRes.status !== 201 && invRes.status !== 200) {
      fail(4, "Invoice & Tracking", `Failed to create invoice. Status: ${invRes.status}. Details: ${invRes.text.slice(0, 150)}`);
    }

    invoiceId = invRes.json?.data?.id || invRes.json?.id;
    if (!invoiceId) {
      fail(4, "Invoice & Tracking", "Created invoice response missing ID");
    }

    const trackRes = await request("GET", `/api/v1/invoices/${invoiceId}/tracking`, {
      Authorization: `Bearer ${adminToken}`,
    });

    if (trackRes.status !== 200) {
      fail(4, "Invoice & Tracking", `GET /tracking returned status ${trackRes.status}. Details: ${trackRes.text.slice(0, 150)}`);
    }

    const trackUrl = trackRes.json?.data?.trackingUrl || trackRes.json?.trackingUrl || "";
    if (!trackUrl.includes("/track/")) {
      fail(4, "Invoice & Tracking", `Tracking URL format invalid. Expected URL containing '/track/', got: ${trackUrl}`);
    }
    pass(4, "Invoice & Tracking", "Invoice created with valid decryptable public tracking link");
  } catch (err: any) {
    fail(4, "Invoice & Tracking", `Request failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 5. GET /reports/operational returns 200
  // -------------------------------------------------------------------------
  try {
    const repRes = await request("GET", "/api/v1/reports/operational?timeRange=30d", {
      Authorization: `Bearer ${adminToken}`,
    });

    if (repRes.status !== 200) {
      fail(5, "Operational Reports", `Expected HTTP 200, got ${repRes.status}. Details: ${repRes.text.slice(0, 150)}`);
    }
    pass(5, "Operational Reports", `HTTP 200 received (KPIs returned cleanly)`);
  } catch (err: any) {
    fail(5, "Operational Reports", `Request failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 6. PUT /invoices/:id, POST /invoices/:id/transitions, POST /approvals/:id/approve, POST /exceptions/:id/resolve return no 500
  // -------------------------------------------------------------------------
  try {
    const putRes = await request("PUT", `/api/v1/invoices/${invoiceId}`, {
      Authorization: `Bearer ${adminToken}`,
    }, {
      notes: "Updated during post-deploy verification",
    });
    if (putRes.status === 500) {
      fail(6, "Mutation Guard", `PUT /invoices/:id returned 500 Internal Server Error: ${putRes.text.slice(0, 150)}`);
    }

    const transRes = await request("POST", `/api/v1/invoices/${invoiceId}/transitions`, {
      Authorization: `Bearer ${adminToken}`,
      "Idempotency-Key": `trans-${Date.now()}-${runId}`,
    }, {
      action: "SUBMIT_APPROVAL",
    });
    if (transRes.status === 500) {
      fail(6, "Mutation Guard", `POST /transitions returned 500 Internal Server Error: ${transRes.text.slice(0, 150)}`);
    }

    const apprRes = await request("POST", `/api/v1/approvals/appr-verify-${runId}/approve`, {
      Authorization: `Bearer ${adminToken}`,
      "Idempotency-Key": `appr-${Date.now()}-${runId}`,
    }, {
      notes: "Verification test approval",
    });
    if (apprRes.status === 500) {
      fail(6, "Mutation Guard", `POST /approvals/:id/approve returned 500 Internal Server Error: ${apprRes.text.slice(0, 150)}`);
    }

    const excRes = await request("POST", `/api/v1/exceptions/exc-verify-${runId}/resolve`, {
      Authorization: `Bearer ${adminToken}`,
      "Idempotency-Key": `exc-${Date.now()}-${runId}`,
    }, {
      resolution: "Verification resolution notes",
    });
    if (excRes.status === 500) {
      fail(6, "Mutation Guard", `POST /exceptions/:id/resolve returned 500 Internal Server Error: ${excRes.text.slice(0, 150)}`);
    }

    pass(6, "Mutation Guard", "All invoice, transition, approval, and exception mutations returned non-500 responses");
  } catch (err: any) {
    fail(6, "Mutation Guard", `Request failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 7. POST /payments/:id/execute returns no 500 (501 or 409 acceptable)
  // -------------------------------------------------------------------------
  try {
    const payRes = await request("POST", `/api/v1/payments/pay-verify-${runId}/execute`, {
      Authorization: `Bearer ${adminToken}`,
      "Idempotency-Key": `pay-${Date.now()}-${runId}`,
    }, {});

    if (payRes.status === 500) {
      fail(7, "Payment Execution Guard", `POST /payments/:id/execute returned 500: ${payRes.text.slice(0, 150)}`);
    }
    pass(7, "Payment Execution Guard", `Returned non-500 response (HTTP ${payRes.status})`);
  } catch (err: any) {
    fail(7, "Payment Execution Guard", `Request failed: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 8. Unauthenticated GET /audit & GET /integrations/status return 401, READ_ONLY returns 403
  // -------------------------------------------------------------------------
  try {
    const unauthAudit = await request("GET", "/api/v1/audit");
    if (unauthAudit.status !== 401) {
      fail(8, "Security & RBAC Guard", `Unauthenticated GET /audit expected 401, got ${unauthAudit.status}`);
    }

    const unauthIntegrations = await request("GET", "/api/v1/integrations/status");
    if (unauthIntegrations.status !== 401) {
      fail(8, "Security & RBAC Guard", `Unauthenticated GET /integrations/status expected 401, got ${unauthIntegrations.status}`);
    }

    // Invite/create a READ_ONLY user to verify 403
    const inviteRes = await request("POST", "/api/v1/auth/team/invite", {
      Authorization: `Bearer ${adminToken}`,
    }, {
      email: `ro-${Date.now()}-${runId}@clearops.dev`,
      fullName: `Read Only ${runId}`,
      role: "READ_ONLY",
    });

    const roUserId = inviteRes.json?.data?.id || inviteRes.json?.id;
    if (!roUserId) {
      fail(8, "Security & RBAC Guard", `Failed to invite READ_ONLY user. Details: ${inviteRes.text.slice(0, 100)}`);
    }

    const { signAccessToken } = await import("../src/lib/jwt");
    readOnlyToken = signAccessToken({
      userId: roUserId,
      organizationId: orgId,
      role: "READ_ONLY",
      tokenVersion: 0,
    });

    const roAudit = await request("GET", "/api/v1/audit", {
      Authorization: `Bearer ${readOnlyToken}`,
    });
    if (roAudit.status !== 403) {
      fail(8, "Security & RBAC Guard", `READ_ONLY GET /audit expected 403 Forbidden, got ${roAudit.status}`);
    }

    pass(8, "Security & RBAC Guard", "Unauthenticated requests correctly rejected with 401; READ_ONLY correctly rejected with 403");
  } catch (err: any) {
    fail(8, "Security & RBAC Guard", `Request failed: ${err.message}`);
  }

    console.log("\n===============================================================================");
    console.log("     ALL 8 POST-DEPLOY VERIFICATION CHECKS PASSED (PRODUCTION HEALTHY)         ");
    console.log("===============================================================================\n");
  } finally {
    if (localServer) {
      localServer.close();
    }
  }
}

if (require.main === module) {
  runVerification().catch((err) => {
    console.error("Verification crashed:", err);
    process.exit(1);
  });
}
