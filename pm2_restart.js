const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAndRestart() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    const check = await ssh.execCommand('grep "Costo / Inversi" /opt/crm-cannabis/insumos.html');
    console.log("=== FILE CONTENT ===");
    console.log(check.stdout);
    
    // Check old directory too just in case
    const checkOld = await ssh.execCommand('grep "Costo / Inversi" /var/www/html/insumos.html');
    console.log("=== FILE CONTENT (VAR/WWW/HTML) ===");
    console.log(checkOld.stdout);

    console.log("Restarting pm2...");
    const restart = await ssh.execCommand('pm2 restart crm-frontend');
    console.log(restart.stdout);
    
    ssh.dispose();
}

checkAndRestart().catch(console.error);
