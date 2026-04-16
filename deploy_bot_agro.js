const execSync = require('child_process').execSync;
try {
    console.log("Subiendo script Agronómico reescrito y robusto...");
    execSync('scp remote_bot_agronomy_server.js root@144.126.216.51:/opt/crm-cannabis/bot_agronomy_server.js', {stdio: 'inherit'});
    
    console.log("Reiniciando PM2...");
    const out = execSync('ssh root@144.126.216.51 "cd /opt/crm-cannabis && pm2 restart bot_agro"').toString();
    console.log(out);
} catch (e) {
    console.error("Error despliegue bot:", e.message);
}
