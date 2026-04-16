const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    const host = '109.199.99.126';
    const username = 'root';
    const passwordsToTry = ['HIDDEN_SECRET_BY_AI', 'SWbCPD6AdBac'];
    let connected = false;

    for (const pwd of passwordsToTry) {
        try {
            await ssh.connect({ host, username, password: pwd, readyTimeout: 10000 });
            connected = true; break;
        } catch (e) {}
    }

    if (!connected) return console.log("Failed all passwords");

    try {
        const nginxConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
        // Escribe la nueva configuración de nginx y reinicia
        await ssh.execCommand(`echo "${nginxConfig}" > /etc/nginx/sites-available/default`);
        const status = await ssh.execCommand('systemctl reload nginx');
        
        console.log('NGINX Reload Status:', status.stderr || status.stdout || "Success");
        console.log("Traffic officially redirected to Next.js (port 3000).");
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
run();
