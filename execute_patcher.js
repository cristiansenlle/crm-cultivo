const execSync = require('child_process').execSync;

try {
    console.log("Subiendo python patcher...");
    execSync('scp vps_n8n_patcher.py root@144.126.216.51:/root/', {stdio: 'inherit'});
    
    console.log("Ejecutando parcheo remoto en N8N...");
    const result = execSync('ssh root@144.126.216.51 "docker cp /root/vps_n8n_patcher.py n8n:/home/node/vps_n8n_patcher.py && docker exec n8n python3 /home/node/vps_n8n_patcher.py && docker restart n8n && pm2 restart bot_agro"');
    console.log(result.toString());
    
    console.log("Completado");
} catch(e) {
    console.error("Fallo:", e.message);
}
