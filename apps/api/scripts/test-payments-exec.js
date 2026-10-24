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
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const paymentsRes = await request('/api/v1/payments', { headers: authHeaders });
  const payments = JSON.parse(paymentsRes.body).data;
  console.log('Payments list:', payments.map(p => ({ id: p.id, status: p.status, amount: p.amount })));

  for (const p of payments) {
    if (p.status !== 'PAID') {
      console.log('Testing execute on non-paid payment:', p.id, p.status);
      const execRes = await request(`/api/v1/payments/${p.id}/execute`, {
        method: 'POST',
        headers: { ...authHeaders, 'Idempotency-Key': `test-exec-${Date.now()}` }
      }, {});
      console.log('Result:', execRes.status, execRes.body);
    }
  }
}

run().catch(console.error);
