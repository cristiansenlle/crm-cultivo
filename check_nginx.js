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

    try {
        const output = await ssh.execCommand('cat /etc/nginx/sites-available/default');
        console.log('NGINX CONFIG:', output.stdout);
        const pm2Status = await ssh.execCommand('pm2 list');
        console.log('PM2 LIST:', pm2Status.stdout);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        ssh.dispose();
    }
}
run();
