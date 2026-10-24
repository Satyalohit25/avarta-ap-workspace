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
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'manager@avarta.dev', password: 'password123' });
  const token = JSON.parse(loginRes.body).accessToken;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  const payRes = await request('/api/v1/payments', { headers: authHeaders });
  const payment = JSON.parse(payRes.body).data.find(p => p.id === 'a526c7d2-17dd-499d-b237-fc562d7126e5');
  console.log('Payment:', payment);

  if (payment?.invoiceId) {
    const invRes = await request(`/api/v1/invoices/${payment.invoiceId}`, { headers: authHeaders });
    const inv = JSON.parse(invRes.body).data;
    console.log('Associated invoice:', {
      id: inv.id,
      number: inv.invoiceNumber,
      status: inv.status,
      workflowState: inv.workflowState,
      workflowTransitions: inv.workflowTransitions
    });
  }
}

run().catch(console.error);
