const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verifyAndFix() {
    try {
        await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'FVRu0i2XiWUP93OtQfI7LvPKod' });

        // Check what's actually running
        console.log("=== Line count of deployed bot-wa.js ===");
        const wc = await ssh.execCommand('wc -l /opt/crm-cannabis/bot-wa.js');
        console.log(wc.stdout);

        // Check line 85-100 to see if disconnect handler is there
        console.log("=== Lines 35-55 of bot-wa.js ===");
        const lines = await ssh.execCommand('sed -n "35,55p" /opt/crm-cannabis/bot-wa.js');
        console.log(lines.stdout);

        // The error says line 93 → old file. Check if new file was properly deployed
        console.log("=== grep for 'disconnected' in bot-wa.js ===");
        const disc = await ssh.execCommand("grep -n 'disconnected\\|auth_failure' /opt/crm-cannabis/bot-wa.js");
        console.log(disc.stdout || "NOT FOUND - old file is still running");

        // The REAL problem: check if there's a userDataDir conflict in the old file
        console.log("\n=== grep for 'userDataDir' in bot-wa.js ===");
        const udd = await ssh.execCommand("grep -n 'userDataDir' /opt/crm-cannabis/bot-wa.js");
        console.log(udd.stdout || "No userDataDir conflict");

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
verifyAndFix();
