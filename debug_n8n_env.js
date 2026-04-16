const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function debugEnv() {
    try {
        await ssh.connect({ 
            host: '109.199.99.126', 
            username: 'root', 
            password: 'HIDDEN_SECRET_BY_AI' 
        });

        console.log('--- Checking PM2 Env ---');
        const pm2Res = await ssh.execCommand('pm2 jlist');
        const services = JSON.parse(pm2Res.stdout);
        const n8n = services.find(s => s.name === 'n8n-service');
        if (n8n) {
            console.log('Environment Variables:', JSON.stringify(n8n.pm2_env, (key, value) => {
                if (key.includes('PASS') || key.includes('KEY') || key.includes('SECRET')) return '***';
                return value;
            }, 2));
        }

        console.log('--- Checking active processes ---');
        const procRes = await ssh.execCommand('ps aux | grep n8n');
        console.log(procRes.stdout);

        ssh.dispose();
    } catch (err) {
        console.error('Debug failed:', err.message);
    }
}

debugEnv();
