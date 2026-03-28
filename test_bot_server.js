const http = require('http');

const payload = {
  batches: ['Planta Madre NP/1/2025', 'Planta Madre RHC/1/2026'],
  inputs: [
    { name: 'Top Veg', qty: 7 },
    { name: 'Barrier', qty: 1 }
  ],
  water_liters: 0.5,
  event_type: 'Aplicacion',
  raw_description: 'Aplicación de Top Veg y Barrier como prueba automatizada del middleware',
};

const req = http.request({
  hostname: 'localhost',
  port: 5006,
  path: '/bot-agronomico',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(payload))
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(`RESPONSE ${res.statusCode}:`, data));
});

req.on('error', (e) => console.error(e));
req.write(JSON.stringify(payload));
req.end();
