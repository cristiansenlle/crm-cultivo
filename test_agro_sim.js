const http = require('http');

const data = JSON.stringify({
  batches: [
    "Planta Madre NP/1/2025",
    "Planta madre NP/2/2025"
  ],
  inputs: "[{\"name\":\"Top Vege\", \"qty\": 6}]",
  water_liters: 2,
  event_type: "Nutricion",
  raw_description: "Aplicación de fertilizante en Carpa 1 - TEST API LOCAL"
});

const options = {
  hostname: '127.0.0.1',
  port: 5006,
  path: '/bot-agronomico',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let raw = '';
  res.on('data', (chunk) => raw += chunk);
  res.on('end', () => console.log(`RESPONSE: ${raw}`));
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
