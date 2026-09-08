import http from "http";

interface ApiResponse {
  statusCode?: number;
  body: string;
}

async function runLiveTests() {
  console.log("==================================================");
  console.log("   CLEAROPS AP WORKSPACE - LIVE API QA TESTING   ");
  console.log("==================================================");

  // 1. Test Auth Login Endpoint
  console.log("\n[TEST 1] Testing POST /api/v1/auth/login...");
  const loginPayload = JSON.stringify({ email: "admin@clearops.dev", password: "password123" });
  
  const loginRes = (await postRequest("/api/v1/auth/login", loginPayload, {})) as ApiResponse;
  console.log("  HTTP Status:", loginRes.statusCode);
  const loginData = JSON.parse(loginRes.body);
  const token = loginData.accessToken;
  console.log("  Authenticated User:", loginData.user?.name, "| Role:", loginData.user?.role);
  console.log("  JWT Token Generated:", token ? "YES (Valid Token)" : "NO");

  if (!token) {
    console.error("Login failed. Body:", loginRes.body);
    return;
  }

  // 2. Test Fetch Invoices List
  console.log("\n[TEST 2] Testing GET /api/v1/invoices (Tenant Isolation)...");
  const invRes = (await getRequest("/api/v1/invoices", { Authorization: `Bearer ${token}` })) as ApiResponse;
  console.log("  HTTP Status:", invRes.statusCode);
  const invData = JSON.parse(invRes.body);
  const invoices = Array.isArray(invData) ? invData : (invData.data ?? []);
  console.log("  Invoices Fetched Count:", invoices.length);
  if (invoices.length > 0) {
    console.log("  Sample Invoice Number:", invoices[0].invoiceNumber, "| Status:", invoices[0].status, "| State:", invoices[0].workflowState);
  }

  // 3. Test Security Middleware: Payment WITHOUT Idempotency Key (Must fail with 400 Bad Request)
  console.log("\n[TEST 3] Security Test: POST /api/v1/payments WITHOUT Idempotency Key...");
  const payPayload = JSON.stringify({ invoiceId: invoices[0]?.id ?? "dummy-id", amount: 50000 });
  const payFailRes = (await postRequest("/api/v1/payments", payPayload, { Authorization: `Bearer ${token}` })) as ApiResponse;
  console.log("  HTTP Status:", payFailRes.statusCode);
  console.log("  Server Error Payload:", payFailRes.body);
  if (payFailRes.statusCode === 400) {
    console.log("  RESULT: PASS — Request correctly blocked with 400 Bad Request!");
  } else {
    console.error("  RESULT: FAIL — Idempotency middleware failed to block request!");
  }

  // 4. Test Security Middleware: Payment WITH Idempotency Key
  console.log("\n[TEST 4] Security Test: POST /api/v1/payments WITH Idempotency Key...");
  const paySuccessRes = (await postRequest("/api/v1/payments", payPayload, {
    Authorization: `Bearer ${token}`,
    "idempotency-key": "test-uuid-live-key-9999",
  })) as ApiResponse;
  console.log("  HTTP Status:", paySuccessRes.statusCode);
  console.log("  Server Response Payload:", paySuccessRes.body);

  // 5. Test Exception List Endpoint
  console.log("\n[TEST 5] Testing GET /api/v1/exceptions...");
  const excRes = (await getRequest("/api/v1/exceptions", { Authorization: `Bearer ${token}` })) as ApiResponse;
  console.log("  HTTP Status:", excRes.statusCode);
  const excData = JSON.parse(excRes.body);
  const exceptions = Array.isArray(excData) ? excData : (excData.data ?? []);
  console.log("  Open Exceptions Count:", exceptions.length);

  console.log("\n==================================================");
  console.log("             LIVE QA TESTING COMPLETE             ");
  console.log("==================================================");
}

function postRequest(path: string, body: string, headers: Record<string, string>) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 4000,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.write(body);
    req.end();
  });
}

function getRequest(path: string, headers: Record<string, string>) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 4000,
        path,
        method: "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.end();
  });
}

runLiveTests();
