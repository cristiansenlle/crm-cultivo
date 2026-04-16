// Activate the workflow and trigger the DDL webhook
const { NodeSSH } = require('node-ssh');
const fetch = require('node-fetch');
const ssh = new NodeSSH();

async function activateAndCreateTable() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    // Activate the workflow via n8n REST API
    const activateRes = await fetch('http://localhost:5678/api/v1/workflows/scpZdPe5Cp4MG98G/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (!activateRes) {
        // Try activating via SQLite directly
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active = 1 WHERE id = 'scpZdPe5Cp4MG98G';"`);
        await ssh.execCommand('pm2 restart n8n-service');
        console.log('Activated via SQLite, waiting for restart...');
        await new Promise(r => setTimeout(r, 5000));
    } else {
        console.log('Activate API status:', activateRes.status);
    }

    // Now trigger the DDL webhook
    console.log('Triggering DDL webhook...');
    try {
        const res = await fetch('http://109.199.99.126:5678/webhook/create-rooms-table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
        console.log('DDL webhook status:', res.status);
        const text = await res.text();
        console.log('DDL response:', text.substring(0, 500));
    } catch (e) {
        console.error('Webhook error:', e.message);
    }

    ssh.dispose();
}

activateAndCreateTable().catch(console.error);
