const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'HIDDEN_SECRET_BY_AI'
        });

        const script = `
        const fs = require('fs');
        const nodes = JSON.parse(fs.readFileSync('/tmp/live_nodes.txt', 'utf8'));
        
        console.log("=== CONSULTAR SALAS ===");
        const salas = nodes.find(n => n.name === 'consultar_salas');
        if(salas) console.log("NOTES:", salas.notes);

        console.log("\\n=== CONSULTAR LOTES ===");
        const lotes = nodes.find(n => n.name === 'consultar_lotes');
        if(lotes) console.log("NOTES:", lotes.notes);

        console.log("\\n=== CARGAR TELEMETRIA ===");
        const tele = nodes.find(n => n.name === 'cargar_telemetria');
        if(tele) console.log("NOTES:", tele.notes);
        `;
        
        await ssh.execCommand('cat > /tmp/check_notes.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/check_notes.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
check();
