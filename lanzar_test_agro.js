const execSync = require('child_process').execSync;

const testScript = `
const http = require('http');

const data = JSON.stringify({
  batches: [
    "Planta Madre NP/1/2025",
    "Planta madre NP/2/2025"
  ],
  inputs: "[{\\"name\\":\\"Top Vege\\", \\"qty\\": 6}]",
  water_liters: 2,
  event_type: "Nutricion",
  raw_description: "App por API local test cost div"
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 5006,
  path: '/bot-agronomico',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, res => {
  let body = '';
  res.on('data', c => body+=c);
  res.on('end', () => console.log("HTTP CODE:", res.statusCode, "BODY:", body));
});

req.on('error', e => console.error("ERR:", e));
req.write(data);
req.end();
`;

try {
    const fs = require('fs');
    fs.writeFileSync('test_remote_agro.js', testScript);
    execSync('scp test_remote_agro.js root@144.126.216.51:/root/', {stdio:'inherit'});
    
    console.log("==> Disparando Test remoto...");
    const res = execSync('ssh root@144.126.216.51 "node /root/test_remote_agro.js"').toString();
    console.log(res);

    console.log("==> Leyendo PM2 Logs resultantes...");
    const logs = execSync('ssh root@144.126.216.51 "pm2 logs bot_agronomy_server --lines 50 --nostream"').toString();
    console.log(logs);
} catch(e) {
    console.log("Error general:", e.message);
}
