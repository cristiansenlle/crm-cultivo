const fs = require('fs');
const cp = require('child_process');

try {
    console.log("Reading locla file...");
    const data = fs.readFileSync('remote_bot_agronomy_server.js');
    
    console.log("Piping to contabo VPS via SSH STDIN...");
    cp.execSync('ssh root@144.126.216.51 "cat > /opt/crm-cannabis/bot_agronomy_server.js"', { input: data });
    
    console.log("Restarting PM2 process bot_agro...");
    const out = cp.execSync('ssh root@144.126.216.51 "cd /opt/crm-cannabis && pm2 restart bot_agro"');
    console.log(out.toString());
    
    console.log("SUCCESS");
} catch(e) {
    console.error("FAIL:", e.message);
}
