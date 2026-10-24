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

  // Test GET on that invoice
  const getRes = await request('/api/v1/invoices/21a11f7d-c723-4db1-99d9-3a67bb1c29b1', { headers: authHeaders });
  console.log('GET invoice status:', getRes.status);
  const inv = JSON.parse(getRes.body).data;
  console.log('Invoice details:', {
    id: inv.id,
    number: inv.invoiceNumber,
    status: inv.status,
    workflowState: inv.workflowState,
    linesCount: inv.lines?.length
  });

  // Try PUT with only invoiceNumber
  const put1 = await request(`/api/v1/invoices/${inv.id}`, {
    method: 'PUT',
    headers: authHeaders
  }, { invoiceNumber: inv.invoiceNumber });
  console.log('PUT 1 (same invoiceNumber):', put1.status, put1.body);

  // Try PUT with subtotalAmount, taxAmount, totalAmount
  const put2 = await request(`/api/v1/invoices/${inv.id}`, {
    method: 'PUT',
    headers: authHeaders
  }, { totalAmount: 1000 });
  console.log('PUT 2 (totalAmount):', put2.status, put2.body);
}

run().catch(console.error);
