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
  // Test without auth
  const noAuth = await request('/api/v1/reports/operational');
  console.log('Without auth:', noAuth.status, noAuth.body);

  // Login
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'manager@avarta.dev', password: 'password123' });
  const token = JSON.parse(loginRes.body).accessToken;

  // Test with auth
  const withAuth = await request('/api/v1/reports/operational', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('With auth (no query):', withAuth.status, withAuth.body);

  const withQuery = await request('/api/v1/reports/operational?timeRange=30d', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('With auth + query:', withQuery.status, withQuery.body);
}

run().catch(console.error);
