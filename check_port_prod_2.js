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

    const check = await ssh.execCommand('curl -s localhost:80 | head -n 10');
    console.log("CURL LOCALHOST:80 ->");
    console.log(check.stdout);

    ssh.dispose();
}
run();
