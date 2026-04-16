// Patch cultivo.js to dynamically load rooms from core_rooms for the cropLocation dropdown
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const ssh = new NodeSSH();

async function patchCultivo() {
    await ssh.connect({ host: '109.199.99.126', username: 'root', password: 'HIDDEN_SECRET_BY_AI' });

    // Download current cultivo.js
    await ssh.getFile('c:\\Users\\Cristian\\.gemini\\antigravity\\crm cannabis\\cultivo_server.js', '/opt/crm-cannabis/cultivo.js');

    let code = fs.readFileSync('cultivo_server.js', 'utf8');

    // Check if loadRoomsForCultivo already exists
    if (code.includes('loadRoomsForCultivo') || code.includes('core_rooms')) {
        console.log('Already has dynamic room loading!');
    } else {
        console.log('Need to add dynamic room loading to dropdown');
    }

    // Find the cropLocation dropdown initialization
    const cropLocationRefLines = [];
    const lines = code.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('cropLocation') || line.includes('sala-veg') || line.includes('sala-flo') || line.includes('Sala 1') || line.includes('select') && line.toLowerCase().includes('sala')) {
            cropLocationRefLines.push({ lineNum: i + 1, content: line.trim() });
        }
    });
    console.log('cropLocation references:\n', cropLocationRefLines.slice(0, 20).map(l => `${l.lineNum}: ${l.content}`).join('\n'));

    ssh.dispose();
}

patchCultivo().catch(console.error);
