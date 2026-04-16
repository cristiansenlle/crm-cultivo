const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkServer() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });
    
    // Check pm2
    const pm2 = await ssh.execCommand('pm2 status');
    console.log("PM2:", pm2.stdout);
    
    // Check nginx
    const nginx = await ssh.execCommand('cat /etc/nginx/sites-enabled/default || cat /etc/nginx/nginx.conf');
    console.log("NGINX:", nginx.stdout);
    
    // Check what directory pm2 is using:
    const pm2dump = await ssh.execCommand('pm2 jlist');
    if (pm2dump.stdout) {
        try {
            const list = JSON.parse(pm2dump.stdout);
            list.forEach(proc => {
                console.log(`Process ${proc.name} runs from ${proc.pm2_env.pm_cwd}`);
            });
        } catch(e){}
    }
    
    ssh.dispose();
}
checkServer().catch(console.error);
