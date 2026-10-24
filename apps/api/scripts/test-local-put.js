const http = require('http');

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:4000${path}`, options, (res) => {
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

  const invRes = await request('/api/v1/invoices', { headers: authHeaders });
  const invoices = JSON.parse(invRes.body).data;
  const sampleInv = invoices[0];
  console.log('Testing PUT against invoice:', sampleInv.id, sampleInv.invoiceNumber);

  const putRes = await request(`/api/v1/invoices/${sampleInv.id}`, {
    method: 'PUT',
    headers: { ...authHeaders, 'Idempotency-Key': 'test-local-put-1' }
  }, { invoiceNumber: sampleInv.invoiceNumber + "-MOD" });
  console.log('PUT status:', putRes.status, 'body:', putRes.body);
}

run().catch(console.error);
