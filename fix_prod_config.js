const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function run() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });

    const runCmd = async (cmd) => {
        console.log('\n▶️ ' + cmd);
        const result = await ssh.execCommand(cmd, {
            onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
            onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
        });
        return result;
    };

    // 1. Upload the fixed supabase-client.js (pointing to production DB)
    await ssh.putFile(
        path.join(__dirname, 'supabase-client.js'),
        '/opt/crm-cannabis/supabase-client.js'
    );
    console.log('✅ supabase-client.js uploaded!');

    // 2. Fix the bot webhook URL too (currently pointing to localhost:5678)
    // The bot needs to point to the SERVER's n8n, not localhost
    const botFix = `
const fs = require('fs');
let src = fs.readFileSync('/opt/crm-cannabis/bot-wa.js','utf8');
src = src.replace(
  "const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/wa-inbound';",
  "const N8N_WEBHOOK_URL = 'http://109.199.99.126:5678/webhook/wa-inbound';"
);
fs.writeFileSync('/opt/crm-cannabis/bot-wa.js', src);
console.log('Bot webhook URL updated!');
`;
    await runCmd(`node -e "${botFix.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);

    // 3. Restart the bot so it picks up the new webhook URL
    await runCmd('pm2 restart whatsapp-bot');
    await runCmd('pm2 list');

    ssh.dispose();
    console.log('\n✅ Done! Supabase credentials updated to production and bot webhook fixed.');
}
run();
