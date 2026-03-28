const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkIssues() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    console.log('--- Checking WhatsApp PM2 Logs ---');
    let res = await ssh.execCommand('pm2 logs whatsapp-bot --lines 50 --nostream');
    console.log(res.stdout);

    console.log('\n--- Checking WhatsApp PM2 Status File ---');
    let res2 = await ssh.execCommand('cat /opt/crm-cannabis/status.json');
    console.log(res2.stdout);

    ssh.dispose();
}

checkIssues().catch(console.error);
