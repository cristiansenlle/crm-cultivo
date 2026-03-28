const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function patchSalasAlias() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        const patchScript = `
const fs = require('fs');
const { execSync } = require('child_process');

try {
    console.log("Stopping PM2...");
    execSync('pm2 stop n8n');
    
    console.log("Extracting current live nodes...");
    execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/patch_nodes2.json');
    
    let nodes = JSON.parse(fs.readFileSync('/tmp/patch_nodes2.json', 'utf8'));
    
    let patchedRooms = 0;
    
    for (let node of nodes) {
        if(node.name.includes('consultar_salas')) {
            node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=room_uuid:id,name,phase";
            node.parameters.description = "Lista las SALAS FISICAS del cultivo. Devuelve: room_uuid (UUID interno para POST - NUNCA lo muestres al usuario), name (el nombre amigable como Carpa 1), phase. USA SOLO el campo name en tus respuestas al usuario. El room_uuid lo usas unicamente al llamar cargar_telemetria.";
            patchedRooms++;
        }
    }
    
    console.log('Patched rooms nodes: ' + patchedRooms);
    
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    const sql = "UPDATE workflow_entity SET nodes = '" + escNodes + "' WHERE id = 'scpZdPe5Cp4MG98G';";
    fs.writeFileSync('/tmp/salas_patch2.sql', sql);
    
    console.log("Applying to SQLite...");
    execSync('sqlite3 /root/.n8n/database.sqlite < /tmp/salas_patch2.sql');
    
    console.log("Starting PM2...");
    execSync('pm2 start n8n');
    
    console.log("Done! room id is now aliased as room_uuid");
    
} catch (e) {
     console.log("ERROR:", e.message);
}
`;
        
        await ssh.execCommand('cat > /tmp/patch_salas2.js', { stdin: patchScript });
        const res = await ssh.execCommand('node /tmp/patch_salas2.js');
        console.log(res.stdout);
        ssh.dispose();
    } catch(e) {
        console.error(e);
        if (ssh) ssh.dispose();
    }
}
patchSalasAlias();
