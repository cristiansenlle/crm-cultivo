const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function patchPrompt() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const patchScript = `
const fs = require('fs');
const { execSync } = require('child_process');

execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/sp3.json');
let nodes = JSON.parse(fs.readFileSync('/tmp/sp3.json', 'utf8'));

// Iron-clad UUID ban rule to inject at the TOP of the system prompt
const UUID_BAN = \`🚫 REGLA ABSOLUTA - NUNCA NEGOCIABLE:
JAMAS muestres UUIDs (cadenas tipo "2de32401-cb5f-4bbd-...") al usuario en tus respuestas.
Las salas tienen un campo "name" con su nombre legible (ej: "Carpa 1"). USA ESE NOMBRE.
Si el tool consultar_salas devuelve {room_uuid: "2de32401...", name: "Carpa 1", phase: "Vegetativo"},
tu respuesta DEBE ser "Carpa 1 (Vegetativo)" - NUNCA el room_uuid.
Igualmente en consultar_lotes, usa core_rooms.name para la sala, NUNCA location ni room_id.

\`;

let changes = 0;
nodes.forEach(n => {
    if (n.type && n.type.includes('agent') && n.parameters && n.parameters.options && n.parameters.options.systemMessage) {
        const existing = n.parameters.options.systemMessage;
        if (!existing.includes('REGLA ABSOLUTA')) {
            n.parameters.options.systemMessage = UUID_BAN + existing;
            changes++;
            console.log('Patched:', n.name);
        } else {
            console.log('Already patched:', n.name);
        }
    }
});

console.log('Changes:', changes);
const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
fs.writeFileSync('/tmp/sp3.sql', "UPDATE workflow_entity SET nodes = '" + escNodes + "' WHERE id = 'scpZdPe5Cp4MG98G';");
execSync('sqlite3 /root/.n8n/database.sqlite < /tmp/sp3.sql');
console.log('SQLite updated');
`;
        await ssh.execCommand('cat > /tmp/patchprompt.js', { stdin: patchScript });
        const r = await ssh.execCommand('node /tmp/patchprompt.js');
        console.log(r.stdout);
        if (r.stderr) console.log('STDERR:', r.stderr.substring(0, 200));

        // Wipe memory so the bot starts fresh with new prompt
        console.log('\n=== Wiping chat memory ===');
        await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "DELETE FROM chat_hub_messages; DELETE FROM chat_hub_sessions;" 2>/dev/null || sqlite3 /root/.n8n/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';" | head -20`);
        
        // Check table names and wipe
        const tables = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite ".tables"`);
        console.log('Tables:', tables.stdout);
        
        // Wipe all memory-related tables
        const memTables = tables.stdout.split(/\s+/).filter(t => t.match(/message|session|memory|chat/i));
        console.log('Memory tables to wipe:', memTables);
        for (const t of memTables) {
            const wipe = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "DELETE FROM ${t};"`);
            console.log(`Wiped ${t}:`, wipe.stdout || 'ok');
        }

        // Verify patch
        console.log('\n=== Verifying prompt patch ===');
        const verify = await ssh.execCommand(`sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id='scpZdPe5Cp4MG98G';" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const n=JSON.parse(d); n.filter(x=>x.type&&x.type.includes('agent')).forEach(x=>console.log(x.name,'prompt start:',x.parameters.options.systemMessage.substring(0,100)))"`);
        console.log(verify.stdout);

        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
patchPrompt();
