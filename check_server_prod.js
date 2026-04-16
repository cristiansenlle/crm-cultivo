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

    console.log("PM2 List:");
    let res = await ssh.execCommand('pm2 list');
    console.log(res.stdout);

    console.log("\nNext-hud logs:");
    res = await ssh.execCommand('pm2 logs next-hud --lines 10  --nostream');
    console.log(res.stdout);
    if(res.stderr) console.log(res.stderr);

    console.log("\nCurr localhost:80 output snippet:");
    res = await ssh.execCommand('curl -s localhost:80 | head -n 20');
    console.log(res.stdout);

    ssh.dispose();
}
run();
