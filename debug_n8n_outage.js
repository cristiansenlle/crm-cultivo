const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    // 1. Check if the workflow is Active (0 or 1)
    const r = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT active FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';\"");
    console.log('DB ACTIVE:', r.stdout);

    // 2. Check n8n logs
    const p = await ssh.execCommand('pm2 logs n8n-service --lines 30 --nostream');
    console.log('--- N8N LOGS ---');
    console.log(p.stdout);

    // 3. Kick production webhook registration
    const keyRes = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite \"SELECT apiKey FROM user_api_keys LIMIT 1;\"");
    const apiKey = keyRes.stdout.trim();
    if (apiKey) {
        console.log('Flushing n8n webhook registration...');
        await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/scpZdPe5Cp4MG98G/deactivate -H "X-N8N-API-KEY: ${apiKey}"`);
        await new Promise(res => setTimeout(res, 1500));
        await ssh.execCommand(`curl -s -X POST http://127.0.0.1:5678/api/v1/workflows/scpZdPe5Cp4MG98G/activate -H "X-N8N-API-KEY: ${apiKey}"`);
        console.log('Webhook forced active again');
    }
    ssh.dispose();
}).catch(console.error);
