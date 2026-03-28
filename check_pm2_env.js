const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkEnv() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- pm2 env n8n-service ---');
    let res = await ssh.execCommand('pm2 env n8n-service');
    // Extract DB related env vars
    const lines = res.stdout.split('\n').filter(l => l.includes('DB_') || l.includes('N8N_') || l.includes('DATABASE'));
    console.log(lines.join('\n'));

    ssh.dispose();
}

checkEnv().catch(console.error);
