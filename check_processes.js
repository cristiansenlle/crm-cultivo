const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkProcesses() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const ps = await ssh.execCommand('ps aux | grep node');
    console.log("=== Node Processes ===");
    console.log(ps.stdout);

    const pm2 = await ssh.execCommand('pm2 list');
    console.log("=== PM2 Processes ===");
    console.log(pm2.stdout);

    const findHtml = await ssh.execCommand('find / -name "insumos.html" -type f 2>/dev/null | grep -v "/var/lib/docker"');
    console.log("=== Found insumos.html at ===");
    console.log(findHtml.stdout);
    
    ssh.dispose();
}

checkProcesses().catch(console.error);
