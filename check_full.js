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
        const salas = nodes.find(n => n.name === 'consultar_salas' || n.name === 'consultar_salas_groq');
        if(salas) console.log(JSON.stringify(salas, null, 2));

        console.log("\\n=== CONSULTAR LOTES ===");
        const lotes = nodes.find(n => n.name === 'consultar_lotes');
        if(lotes) console.log(JSON.stringify(lotes, null, 2));

        `;
        
        await ssh.execCommand('cat > /tmp/check_full.js', { stdin: script });
        const res = await ssh.execCommand('node /tmp/check_full.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
check();
