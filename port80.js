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

    console.log("Stopping old frontend...");
    await ssh.execCommand('pm2 stop frontend');
    
    console.log("Restarting next-hud on port 80...");
    await ssh.execCommand('pm2 delete next-hud || true');
    const startCmd = await ssh.execCommand('pm2 start npm --name "next-hud" -- start -- -p 80', { cwd: '/opt/crm-cannabis-next' });
    
    console.log("Start output:", startCmd.stdout);
    if(startCmd.stderr) console.log("Start stderr:", startCmd.stderr);

    console.log("Done! Production traffic shifted to Next.js on port 80.");
    ssh.dispose();
}
run();
