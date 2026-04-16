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
    };

    // Upload the fixed bot-wa.js
    await ssh.putFile(
        path.join(__dirname, 'bot-wa.js'),
        '/opt/crm-cannabis/bot-wa.js'
    );
    console.log('✅ bot-wa.js uploaded with Puppeteer fix!');

    // Kill all stale chrome processes completely
    await runCmd('Kill all chrome', 'pkill -9 -f "chrome" 2>/dev/null; pkill -9 -f "chromium" 2>/dev/null; sleep 2; echo "done"');

    // Clean up tmp chrome dirs from old restarts
    await runCmd('Clean old chrome tmp dirs', 'rm -rf /tmp/whatsapp-chrome-* 2>/dev/null; echo "done"');

    // Restart bot with the new code
    await runCmd('Stop bot', 'pm2 stop whatsapp-bot');
    await runCmd('Wait', 'sleep 3');
    await runCmd('Start bot', 'pm2 start whatsapp-bot');
    await runCmd('Wait for init', 'sleep 12');
    await runCmd('Bot logs', 'pm2 logs whatsapp-bot --lines 20 --nostream');

    ssh.dispose();
}
run();
