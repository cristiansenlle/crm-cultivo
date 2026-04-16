const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function getOldHtml() {
    await ssh.connect({
        host: '109.199.99.126',
        username: 'root',
        password: 'HIDDEN_SECRET_BY_AI'
    });

    // Check old insumos.html for Modal Overlay
    const r = await ssh.execCommand('grep -i "Modal" /var/www/html/insumos.html');
    console.log("=== Old HTML ==");
    console.log(r.stdout);
    
    // Check old insumos.js for its openAdjustModal logic
    const j = await ssh.execCommand('grep -A 10 "function openAdjustModal" /var/www/html/insumos.js');
    console.log("=== Old JS ==");
    console.log(j.stdout);
    
    ssh.dispose();
}

getOldHtml().catch(console.error);
