// Activate workflow via SQLite and trigger DDL
const { NodeSSH } = require('node-ssh');
const fetch = require('node-fetch');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Activate workflow in SQLite
    await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "UPDATE workflow_entity SET active = 1 WHERE id = 'scpZdPe5Cp4MG98G';"`);
    await ssh.execCommand('pm2 restart n8n-service');

    console.log('Activated via SQLite. Waiting for restart...');
    await new Promise(r => setTimeout(r, 6000));

    // Trigger the DDL webhook
    console.log('Triggering DDL webhook...');
    const res = await fetch('http://109.199.99.126:5678/webhook/create-rooms-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
    });
    console.log('DDL status:', res.status);
    const text = await res.text();
    console.log('DDL response:', text.substring(0, 500));

    ssh.dispose();
}

run().catch(console.error);
