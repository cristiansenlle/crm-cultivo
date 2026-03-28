const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function waitAndCheck() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        console.log("Waiting 15 seconds for bot to connect...");
        await new Promise(r => setTimeout(r, 15000));

        console.log("=== Bot out log (last 30 lines) ===");
        const out = await ssh.execCommand('tail -n 30 /root/.pm2/logs/whatsapp-bot-out.log');
        console.log(out.stdout);

        console.log("=== Bot error log (last 10 lines) ===");
        const err = await ssh.execCommand('tail -n 10 /root/.pm2/logs/whatsapp-bot-error.log');
        console.log(err.stdout);

        console.log("=== Chrome processes ===");
        const chrome = await ssh.execCommand('ps aux | grep -E "chrome|chromium" | grep -v grep | head -3');
        console.log(chrome.stdout || "None running");

        console.log("=== N8N latest executions ===");
        const exec = await ssh.execCommand("sqlite3 /root/.n8n/database.sqlite 'SELECT id,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 3;'");
        console.log(exec.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
waitAndCheck();
