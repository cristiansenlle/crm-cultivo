const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const script = `
        const fs = require('fs');
        const nodes = JSON.parse(fs.readFileSync('/tmp/live_nodes.txt', 'utf8'));
        
        console.log("=== CONSULTAR SALAS ===");
        const salas = nodes.find(n => n.name === 'consultar_salas');
        if(salas && salas.parameters && salas.parameters.options) console.log("DESC:", salas.parameters.options.toolDescription);

        console.log("\\n=== CONSULTAR LOTES ===");
        const lotes = nodes.find(n => n.name === 'consultar_lotes');
        if(lotes && lotes.parameters && lotes.parameters.options) console.log("DESC:", lotes.parameters.options.toolDescription);

        console.log("\\n=== CARGAR TELEMETRIA ===");
        const tele = nodes.find(n => n.name === 'cargar_telemetria');
        if(tele && tele.parameters && tele.parameters.options) console.log("DESC:", tele.parameters.options.toolDescription);
        `;
        
        await ssh.execCommand('cat > /tmp/check_desc.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/check_desc.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
check();
