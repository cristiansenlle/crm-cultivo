const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const runCmd = async (label, cmd) => {
        console.log(`\n▶️ ${label}`);
        const r = await ssh.execCommand(cmd);
        if (r.stdout) console.log(r.stdout);
        if (r.stderr && r.stderr.trim()) console.log('ERR:', r.stderr.substring(0, 200));
        return r;
    };

    // Verify current bot-wa.js on server has our fixes
    await runCmd('Check bot-wa.js line 30', "sed -n '1,15p' /opt/crm-cannabis/bot-wa.js");
    await runCmd('Check for userDataDir in bot-wa.js', "grep -n 'userDataDir' /opt/crm-cannabis/bot-wa.js || echo 'NO userDataDir - good!'");

    // Upload fresh bot-wa.js
    await ssh.putFile(path.join(__dirname, 'bot-wa.js'), '/opt/crm-cannabis/bot-wa.js');
    console.log('\n✅ bot-wa.js re-uploaded!');

    // Verify after upload
    await runCmd('Verify - no userDataDir', "grep -n 'userDataDir' /opt/crm-cannabis/bot-wa.js || echo 'NO userDataDir ✅'");
    await runCmd('Verify - execSync present', "grep -n 'execSync' /opt/crm-cannabis/bot-wa.js");

    // Delete and re-create PM2 app to clear cache
    await runCmd('Kill all chrome', 'pkill -9 -f chrome 2>/dev/null; pkill -9 -f chromium 2>/dev/null; sleep 1; echo done');
    await runCmd('Stop and delete from PM2', 'pm2 stop whatsapp-bot && pm2 delete whatsapp-bot && echo "deleted"');
    await runCmd('Re-register bot in PM2', 'pm2 start /opt/crm-cannabis/bot-wa.js --name whatsapp-bot --cwd /opt/crm-cannabis && pm2 save');
    await runCmd('Wait for init', 'sleep 15');
    await runCmd('Final bot logs', 'pm2 logs whatsapp-bot --lines 25 --nostream');
    await runCmd('PM2 status', 'pm2 list');

    // N8N: Try to activate workflows via REST API using basic auth header
    await runCmd('Activate ALL n8n workflows', `
    # Get all workflow IDs and activate them
    RESPONSE=$(curl -s -u 'admin:AdminSeguro123!' http://109.199.99.126:5678/api/v1/workflows?limit=20)
    echo "Workflows response: $RESPONSE"
  `);

    ssh.dispose();
}
run();
