const https = require('https');

function req(path, method, body, token) {
  return new Promise((resolve) => {
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
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  // 1. Login with correct password
  console.log('=== Login as aaas@gmail.com ===');
  let r = await req('/auth/login', 'POST', { email: 'aaas@gmail.com', password: 'aaas1599' });
  console.log('Status:', r.status);
  console.log('Body:', JSON.stringify(r.body));
  if (r.status === 201) {
    const token = r.body.token;
    // Try listing clientes
    console.log('\n=== GET /clientes ===');
    r = await req('/clientes', 'GET', null, token);
    console.log('Status:', r.status);
    console.log('Body:', JSON.stringify(r.body).substring(0, 300));
    
    // Try creating a client
    console.log('\n=== POST /clientes ===');
    r = await req('/clientes', 'POST', { nombre: 'Test Client', telefono: '123', carnet: '123', ubicacion: 'Test' }, token);
    console.log('Status:', r.status);
    console.log('Body:', JSON.stringify(r.body));
  }
})();
