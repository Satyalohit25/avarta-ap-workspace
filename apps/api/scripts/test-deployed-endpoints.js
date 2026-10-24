const https = require('https');

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(`https://avarta-api.onrender.com${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function run() {
  // 1. Login
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'manager@avarta.dev', password: 'password123' });
  
  const token = JSON.parse(loginRes.body).accessToken;
  console.log('Login succeeded, token received');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Invoices list
  const invRes = await request('/api/v1/invoices', { headers: authHeaders });
  const invoices = JSON.parse(invRes.body).data;
  console.log('Total invoices:', invoices.length);
  const sampleInv = invoices[0];
  console.log('Sample invoice:', { id: sampleInv.id, invoiceNumber: sampleInv.invoiceNumber, status: sampleInv.status });

  // 3. Test GET /invoices/:id/tracking
  const trackRes = await request(`/api/v1/invoices/${sampleInv.id}/tracking`, { headers: authHeaders });
  console.log(`GET /invoices/${sampleInv.id}/tracking:`, trackRes.status, trackRes.body);

  // 3b. Test GET /invoices/:id/tracking without /api/v1
  const trackRawRes = await request(`/invoices/${sampleInv.id}/tracking`, { headers: authHeaders });
  console.log(`GET /invoices/${sampleInv.id}/tracking (root):`, trackRawRes.status, trackRawRes.body);

  // 4. Test GET /reports/operational
  const reportRes = await request('/api/v1/reports/operational?timeRange=30d', { headers: authHeaders });
  console.log('GET /api/v1/reports/operational:', reportRes.status, reportRes.body.substring(0, 200));

  // 5. Test PUT /invoices/:id (Inbox review update)
  // Let's see what payload Inbox review sends
  const putRes = await request(`/api/v1/invoices/${sampleInv.id}`, {
    method: 'PUT',
    headers: { ...authHeaders, 'Idempotency-Key': 'test-idemp-1' }
  }, { invoiceNumber: sampleInv.invoiceNumber });
  console.log(`PUT /invoices/${sampleInv.id}:`, putRes.status, putRes.body);

  // 6. Test POST /payments/:id/execute
  // Find a payment first
  const paymentsRes = await request('/api/v1/payments', { headers: authHeaders });
  console.log('Payments list status:', paymentsRes.status);
  let payments = [];
  try {
    payments = JSON.parse(paymentsRes.body).data || [];
  } catch(e) {}
  console.log('Total payments:', payments.length);
  if (payments.length > 0) {
    const samplePayment = payments[0];
    console.log('Sample payment:', { id: samplePayment.id, status: samplePayment.status });
    const execRes = await request(`/api/v1/payments/${samplePayment.id}/execute`, {
      method: 'POST',
      headers: { ...authHeaders, 'Idempotency-Key': 'test-exec-1' }
    }, {});
    console.log(`POST /payments/${samplePayment.id}/execute:`, execRes.status, execRes.body);
  }

  // 7. Test POST /invoices/:id/process
  const procRes = await request(`/api/v1/invoices/${sampleInv.id}/process`, {
    method: 'POST',
    headers: { ...authHeaders, 'Idempotency-Key': 'test-proc-1' }
  }, {});
  console.log(`POST /invoices/${sampleInv.id}/process:`, procRes.status, procRes.body);
}

run().catch(console.error);
