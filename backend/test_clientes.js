const https = require('https');
const BASE = 'https://web-production-c811d.up.railway.app';

async function req(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'web-production-c811d.up.railway.app', port: 443, path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  // 1. Login as admin
  console.log('=== Login as aaas@gmail.com ===');
  const login = await req('/auth/login', 'POST', { email: 'aaas@gmail.com', password: 'aaas1599' });
  console.log('Status:', login.status);
  if (login.status !== 201) {
    console.log('Login failed:', login.body);
    process.exit(1);
  }
  const token = login.body.token;
  console.log('Token obtained (first 20 chars):', token.substring(0, 20) + '...');

  // 2. Try to create a client
  console.log('\n=== POST /clientes (create client) ===');
  const create = await req('/clientes', 'POST', {
    nombre: 'Test Client',
    telefono: '123456789',
    carnet: '12345',
    ubicacion: 'Test location'
  }, token);
  console.log('Status:', create.status);
  console.log('Body:', JSON.stringify(create.body, null, 2));

  // 3. Try GET /clientes (requires admin role)
  console.log('\n=== GET /clientes (list clients) ===');
  const list = await req('/clientes', 'GET', null, token);
  console.log('Status:', list.status);
  console.log('Body:', JSON.stringify(list.body, null, 2).substring(0, 300));
})();
