const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' }).then(async () => {
    // Check VPS logs for the actual Supabase error!
    const res = await ssh.execCommand('pm2 logs bot-agronomy --lines 50 --nostream');
    console.log('CRM BOT LOGS:', res.stdout);
    ssh.dispose();
}).catch(console.error);
