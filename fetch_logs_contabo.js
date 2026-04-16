const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getLogs() {
    const passwordsToTry = ['HIDDEN_SECRET_BY_AI', 'SWbCPD6AdBac'];
    let connected = false;
    for (const pwd of passwordsToTry) {
        try {
            await ssh.connect({
                host: '109.199.99.126',
                username: 'root',
                password: pwd,
                readyTimeout: 5000
            });
            connected = true;
            break;
        } catch(err) {}
    }
    
    if(!connected) return console.log("SSH Failed.");
    
    try {
        console.log('✅ Connected. Fetching last PM2 logs out of next-hud...\n');
        
        const output = await ssh.execCommand('pm2 logs next-hud --lines 100 --nostream');
        console.log("----- STDOUT -----");
        console.log(output.stdout);
        console.log("----- STDERR -----");
        console.log(output.stderr);
        
        process.exit(0);
    } catch(err) {
        console.error("Exec Error:", err);
    }
}
getLogs();
