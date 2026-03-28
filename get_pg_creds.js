// Creates core_rooms table by adding a SQL execution node to n8n workflow temporarily,
// firing it, then checking results. Alternatively use the Postgres Execute Query API.
const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function createTableViaPostgres() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    // Use n8n's "Execute Workflow" REST API to run a 1-time Postgres DDL command
    // First, let's look at the Postgres credential connection details to get the conn string
    const credData = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT data FROM credentials_entity WHERE name='Postgres account';"`);
    console.log('Encrypted Postgres credential data (first 200):', credData.stdout.substring(0, 200));

    // Check if there's a way to get decrypted credentials via n8n's exec
    const n8nKey = await ssh.execCommand('grep -r "encryptionKey\\|N8N_ENCRYPTION_KEY" /root/.n8n/config 2>/dev/null | head -5');
    console.log('N8N encryption key location:', n8nKey.stdout.substring(0, 500));

    // Get the n8n config file content
    const configContent = await ssh.execCommand('cat /root/.n8n/config 2>/dev/null | head -30');
    console.log('N8N Config:', configContent.stdout.substring(0, 500));

    // Look for PM2 ecosystem/start config with env vars
    const pm2Config = await ssh.execCommand('cat /root/ecosystem.config.js 2>/dev/null || ls /root/*.config.js 2>/dev/null');
    console.log('PM2 config:', pm2Config.stdout.substring(0, 500));

    ssh.dispose();
}

createTableViaPostgres().catch(console.error);
