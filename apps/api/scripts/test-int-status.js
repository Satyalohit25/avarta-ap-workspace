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
  }, { email: 'admin@avarta.dev', password: 'password123' });
  const token = JSON.parse(loginRes.body).accessToken;

  const intRes = await request('/api/v1/integrations/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('GET /api/v1/integrations/status:', intRes.status, intRes.body);
}

run().catch(console.error);
