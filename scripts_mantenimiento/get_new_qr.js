const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    console.log('Connecting to VPS...');
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
    });
    
    console.log('\n=== CLEARING OLD SESSION ===');
    await ssh.execCommand('mv /opt/crm-cannabis/.wwebjs_auth /opt/crm-cannabis/.wwebjs_auth_backup_$(date +%s)');
    
    console.log('\n=== RESTARTING BOT ===');
    await ssh.execCommand('pm2 restart bot-wa');
    
    console.log('\nWaiting 15 seconds for QR...');
    await new Promise(r => setTimeout(r, 15000));
    
    console.log('\n=== EXTRACTING QR STRING ===');
    // Read the log and grep for the raw QR string we patched last time
    const res = await ssh.execCommand('cat /root/.pm2/logs/bot-wa-out.log | grep -E "^1@.*" | tail -n 1');
    if (res.stdout) {
        console.log("RAW QR:", res.stdout);
        const qrString = encodeURIComponent(res.stdout.trim());
        console.log(`QR LINK: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrString}`);
    } else {
        console.log("QR string not found yet. Let me check the latest lines of the log:");
        const tail = await ssh.execCommand('tail -n 30 /root/.pm2/logs/bot-wa-out.log');
        console.log(tail.stdout);
    }
    
    ssh.dispose();
}

run().catch(console.error);
