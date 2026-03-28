const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function definitívePatch() {
    try {
        await ssh.connect({
            host: '109.199.99.126',
            username: 'root',
            password: 'FVRu0i2XiWUP93OtQfI7LvPKod'
        });

        // THIS TIME: we do NOT stop n8n-service. We only edit SQLite, then trigger a 
        // SOFT workflow reload via the N8N API without killing the webhook handler.

        const patchScript = `
const fs = require('fs');
const { execSync } = require('child_process');

try {
    console.log("Extracting live nodes (NO PM2 STOP)...");
    execSync('sqlite3 /root/.n8n/database.sqlite "SELECT nodes FROM workflow_entity WHERE id=\\'scpZdPe5Cp4MG98G\\';" > /tmp/def_nodes.json');
    
    let nodes = JSON.parse(fs.readFileSync('/tmp/def_nodes.json', 'utf8'));
    
    let changes = 0;
    for (let node of nodes) {
        // consultar_lotes: Remove ALL UUID columns. Only return id (batch text id), strain, stage, core_rooms(name)
        if(node.name.includes('consultar_lotes')) {
            const old = node.parameters.url;
            node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_batches?select=id,strain,stage,core_rooms(name)&order=id.asc";
            node.parameters.description = "Lista LOTES DE PLANTAS (batches). Cada lote tiene: id (texto), strain, stage, y core_rooms.name (nombre legible de la sala). USA core_rooms.name para referirte a la sala, JAMAS uses location ni room_id.";
            changes++;
            console.log(node.name + ": " + old.substring(40) + " -> nuevo OK");
        }
        
        // consultar_salas: Keep room_uuid alias (UUID for internal use), name, phase
        // The description already says "NUNCA muestres room_uuid al usuario"
        if(node.name.includes('consultar_salas')) {
            node.parameters.url = "https://opnjrzixsrizdnphbjnq.supabase.co/rest/v1/core_rooms?select=room_uuid:id,name,phase";
            node.parameters.description = "Lista SALAS FISICAS. Devuelve: room_uuid (UUID INTERNO - NUNCA lo menciones al usuario), name (usa ESTE nombre al hablarle al usuario, ej: Carpa 1), phase. Cuando el usuario pregunta que salas hay, responde con el 'name', no con el 'room_uuid'.";
            changes++;
        }
    }
    
    console.log("Total changes: " + changes);
    
    const escNodes = JSON.stringify(nodes).replace(/'/g, "''");
    fs.writeFileSync('/tmp/def_patch.sql', "UPDATE workflow_entity SET nodes = '" + escNodes + "' WHERE id = 'scpZdPe5Cp4MG98G';");
    
    execSync('sqlite3 /root/.n8n/database.sqlite < /tmp/def_patch.sql');
    console.log("SQLite patched without stopping N8N.");
    
    // Trigger N8N to reload workflow via API (no restart needed!)
    // Deactivate then reactivate via API to flush webhook cache
    const result = execSync('curl -s -X POST http://localhost:5678/rest/workflows/scpZdPe5Cp4MG98G/activate -H "Content-Type: application/json" --cookie-jar /tmp/n8n_cookies.txt 2>&1').toString();
    console.log("Activate via API:", result.substring(0, 200));
    
} catch (e) {
    console.log("ERROR:", e.message);
}
`;
        
        await ssh.execCommand('cat > /tmp/defpatch.js', { stdin: patchScript });
        const res = await ssh.execCommand('node /tmp/defpatch.js');
        console.log(res.stdout);
        
        ssh.dispose();
    } catch(e) {
        console.error(e.message);
        if (ssh) ssh.dispose();
    }
}
definitívePatch();
