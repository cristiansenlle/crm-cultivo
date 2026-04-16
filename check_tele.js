const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkTele() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const fs = require('fs');
        const nodes = JSON.parse(fs.readFileSync('/tmp/live_nodes.txt', 'utf8'));
        
        const tele = nodes.find(n => n.name === 'cargar_telemetria');
        console.log("=== CARGAR TELEMETRIA PARAMETERS ===");
        if(tele) console.log(JSON.stringify(tele.parameters, null, 2));

        const lotes = nodes.find(n => n.name === 'consultar_lotes');
        console.log("=== CONSULTAR LOTES PARAMETERS ===");
        if(lotes) console.log(JSON.stringify(lotes.parameters.url, null, 2));
        `;
        
        await ssh.execCommand('cat > /tmp/check_tele.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/check_tele.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
checkTele();
