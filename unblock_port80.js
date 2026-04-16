const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    const host = '109.199.99.126';
    const username = 'root';
    const passwordsToTry = ['HIDDEN_SECRET_BY_AI', 'SWbCPD6AdBac'];
    let connected = false;

    for (const pwd of passwordsToTry) {
        try {
           await ssh.connect({ host, username, password: pwd, readyTimeout: 10000 });
           connected = true; break;
        } catch (e) {}
    }

    if (!connected) return console.log("Failed all passwords");

    console.log("Killing anything on port 80...");
    await ssh.execCommand('fuser -k 80/tcp');
    
    console.log("Setting Node capabilities for protected port bindings...");
    await ssh.execCommand('setcap cap_net_bind_service=+ep `readlink -f \\`which node\\``');

    console.log("Restarting next-hud PM2...");
    const out = await ssh.execCommand('pm2 restart next-hud', { cwd: '/opt/crm-cannabis-next' });
    console.log(out.stdout);

    console.log("\nNext-hud current logs:");
    const logs = await ssh.execCommand('pm2 logs next-hud --lines 10 --nostream');
    console.log(logs.stdout);
    
    // Check if localhost:80 serves nextjs now
    const check = await ssh.execCommand('curl -s localhost:80 | head -n 10');
    console.log("\nCurl result:", check.stdout);

    ssh.dispose();
}
run();
